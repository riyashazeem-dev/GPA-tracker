// scripts/test-isolation.mjs
// Live two-account isolation test. Requires Supabase URL + anon key and two
// pre-created test users (email/password). Skips cleanly if not configured.
//
// TEST_A_EMAIL / TEST_A_PASSWORD / TEST_B_EMAIL / TEST_B_PASSWORD
// SUPABASE_URL / SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const a = { email: process.env.TEST_A_EMAIL, password: process.env.TEST_A_PASSWORD };
const b = { email: process.env.TEST_B_EMAIL, password: process.env.TEST_B_PASSWORD };

if (!url || !key || !a.email || !b.email) {
  console.log('SKIP: live isolation test not configured (set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_A_*, TEST_B_*).');
  process.exit(0);
}

function client() {
  return createClient(url, key, { auth: { persistSession: false } });
}

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
  if (!cond) failures++;
};

const ca = client();
const cb = client();
await ca.auth.signInWithPassword({ email: a.email, password: a.password });
await cb.auth.signInWithPassword({ email: b.email, password: b.password });

const aId = (await ca.auth.getUser()).data.user?.id;
const bId = (await cb.auth.getUser()).data.user?.id;

// A inserts a result; B inserts a result (course id must exist).
const courseId = process.env.TEST_COURSE_ID;
if (!courseId) {
  console.log('SKIP: set TEST_COURSE_ID to a real course id.');
  process.exit(0);
}
const insA = await ca.from('results').insert({ student_id: aId, course_id: courseId, semester: 1, academic_year: 2025, marks: 80, counts_toward_gpa: true }).select('id').single();
const insB = await cb.from('results').insert({ student_id: bId, course_id: courseId, semester: 1, academic_year: 2025, marks: 40, counts_toward_gpa: true }).select('id').single();
check('A can insert own result', !!insA.data);
check('B can insert own result', !!insB.data);

const aRows = await ca.from('results').select('id, student_id');
const bRows = await cb.from('results').select('id, student_id');
check('A reads only own records', (aRows.data ?? []).every((r) => r.student_id === aId));
check('B reads only own records', (bRows.data ?? []).every((r) => r.student_id === bId));
check('A cannot see B records', !(aRows.data ?? []).some((r) => r.student_id === bId));

const upd = await ca.from('results').update({ marks: 100 }).eq('id', insB.data.id).select('id');
check('A cannot modify B result', (upd.data ?? []).length === 0);

const courseWrite = await ca.from('courses').insert({ curriculum_version_id: process.env.TEST_VERSION_ID, department_id: process.env.TEST_DEPT_ID, code: 'X-TEST', name: 'X', semester: 1, credits: 1, category: 'core' });
check('Student cannot write curriculum', !!courseWrite.error);

console.log(failures === 0 ? '\nALL ISOLATION CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);