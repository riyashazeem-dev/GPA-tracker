// scripts/validate-curriculum.mjs
// Compares the imported curriculum in Supabase against official totals and
// generates docs/VALIDATION_REPORT.md. Read-only: never modifies source data.
//
// Requires env: SUPABASE_URL, SUPABASE_ANON_KEY (public anon/publishable key).
// Run: node scripts/validate-curriculum.mjs

import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY. Set them and retry.');
  process.exit(1);
}

const supabase = createClient(url, key);
const expected = JSON.parse(await readFile(join(ROOT, 'scripts/curriculum-expected.json'), 'utf8'));

async function all(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return data ?? [];
}

const [departments, versions, courses, electiveReqs] = await Promise.all([
  all('departments'),
  all('curriculum_versions'),
  all('courses'),
  all('elective_requirements'),
]);

const deptByCode = new Map(departments.map((d) => [d.code, d]));
const versionById = new Map(versions.map((v) => [v.id, v]));
const lines = [];
const push = (s = '') => lines.push(s);

push('# Curriculum Validation Report');
push('');
push(`Generated: ${new Date().toISOString()}`);
push('');
push(`Departments: ${departments.length} | Curriculum versions: ${versions.length} | Courses: ${courses.length}`);
push('');

let totalIssues = 0;
const issue = (msg) => {
  totalIssues++;
  push(`- **ISSUE:** ${msg}`);
};

for (const code of ['IS', 'SE', 'DS']) {
  const dept = deptByCode.get(code);
  push(`## ${code}${dept ? ` — ${dept.name}` : ' (department missing)'}`);
  push('');
  if (!dept) {
    issue(`${code} department not found`);
    continue;
  }

  const deptCourses = courses.filter((c) => c.department_id === dept.id);
  const activeVersion = versions.find((v) => v.department_id === dept.id && v.is_active);
  const versionCourses = activeVersion
    ? deptCourses.filter((c) => c.curriculum_version_id === activeVersion.id)
    : deptCourses;

  // Course count
  const expCount = expected.departments?.[code]?.courseCount;
  push(`- Courses imported: ${versionCourses.length}${expCount != null ? ` (expected ${expCount})` : ' (expected: pending)'}`);
  if (expCount != null && versionCourses.length !== expCount) {
    issue(`${code} course count ${versionCourses.length} != expected ${expCount}`);
  }

  // Credit total (NULL credits ignored, never treated as 0)
  const creditTotal = versionCourses.reduce((s, c) => s + (c.credits ?? 0), 0);
  const expCredits = expected.departments?.[code]?.totalCredits;
  push(`- Credit total: ${creditTotal}${expCredits != null ? ` (expected ${expCredits})` : ' (expected: pending)'}`);
  if (expCredits != null && creditTotal !== expCredits) {
    issue(`${code} credit total ${creditTotal} != expected ${expCredits}`);
  }

  // Missing course codes
  const missingCodes = versionCourses.filter((c) => !c.code || !c.code.trim());
  push(`- Missing course codes: ${missingCodes.length}`);
  if (missingCodes.length) issue(`${code} has ${missingCodes.length} course(s) with missing code`);

  // Duplicate course codes
  const seen = new Map();
  for (const c of versionCourses) seen.set(c.code, (seen.get(c.code) ?? 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1);
  push(`- Duplicate course codes: ${dupes.length}`);
  if (dupes.length) issue(`${code} duplicate codes: ${dupes.map(([c]) => c).join(', ')}`);

  // Incorrect semester assignments
  const badSem = versionCourses.filter((c) => !Number.isInteger(c.semester) || c.semester < 1 || c.semester > 8);
  push(`- Incorrect semester assignments: ${badSem.length}`);
  if (badSem.length) issue(`${code} has ${badSem.length} course(s) with semester outside 1..8`);

  // Missing credits (informational)
  const nullCredits = versionCourses.filter((c) => c.credits == null);
  push(`- Modules with NULL credits: ${nullCredits.length}${nullCredits.length ? ` (${nullCredits.map((c) => c.code).join(', ')})` : ''}`);

  // Non-GPA modules
  const nonGpa = versionCourses.filter((c) => c.gpa_eligible === false);
  push(`- Non-GPA modules: ${nonGpa.length}${nonGpa.length ? ` (${nonGpa.map((c) => c.code).join(', ')})` : ''}`);

  // Elective credit totals vs requirements
  const reqs = electiveReqs.filter((r) => r.department_id === dept.id);
  push(`- Elective requirements: ${reqs.length}`);
  for (const req of reqs) {
    const avail = versionCourses
      .filter((c) => c.is_elective && c.semester === req.semester)
      .reduce((s, c) => s + (c.credits ?? 0), 0);
    const ok = avail >= req.required_credits;
    push(`  - Semester ${req.semester}: required ${req.required_credits}, available elective credits ${avail} ${ok ? 'OK' : 'SHORT'}`);
    if (!ok) issue(`${code} semester ${req.semester} elective credits ${avail} < required ${req.required_credits}`);
  }

  // Expected elective requirements cross-check
  const expReq = expected.electiveRequirements?.[code] ?? {};
  for (const [sem, credits] of Object.entries(expReq)) {
    const actual = reqs.find((r) => String(r.semester) === sem);
    if (!actual) issue(`${code} semester ${sem} elective requirement missing (expected ${credits})`);
    else if (actual.required_credits !== credits) issue(`${code} semester ${sem} elective requirement ${actual.required_credits} != expected ${credits}`);
  }

  push('');
}

push('## Summary');
push('');
push(`Total issues: ${totalIssues}`);
push('');
push(totalIssues === 0 ? 'Result: PASS' : 'Result: ISSUES FOUND (source data was NOT modified)');

await writeFile(join(ROOT, 'docs/VALIDATION_REPORT.md'), lines.join('\n'), 'utf8');
console.log(`Report written to docs/VALIDATION_REPORT.md (${totalIssues} issue(s)).`);