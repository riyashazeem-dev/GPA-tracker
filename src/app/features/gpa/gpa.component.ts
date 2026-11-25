import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course, CourseResult, GpaModuleInput, Profile } from '../../models';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { LocalCurriculumService, DepartmentCode } from '../../services/local-curriculum.service';
import { GpaCalculationService } from '../../services/gpa-calculation.service';
import { ElectiveService } from '../../services/elective.service';
import { isSupabaseConfigured } from '../../core/supabase/supabase.client';
import { gradeForMarks, OFFICIAL_GRADE_SCALE } from '../../services/gpa';

interface Draft {
  course: Course;
  letterGrade: string;
  gradePoint: number | null;
  resultId?: string;
  completed?: boolean;
}

interface GradeEdit {
  letterGrade: string;
  resultId?: string;
}

interface CloudDraft extends Draft {
  academicYear?: number;
}

@Component({
  selector: 'app-gpa',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (supabaseMode) {
      <section>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-2xl font-bold">Result history and repeats</h1>
          <div class="gpa-muted flex flex-wrap items-center gap-4 text-sm">
            <label class="flex items-center gap-2">
              Semester
              <select class="gpa-control" [disabled]="busy()"
                [ngModel]="semester()" (ngModelChange)="selectCloudSemester($event)">
                @for (s of semesters; track s) { <option [ngValue]="s">{{ s }}</option> }
              </select>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" [disabled]="busy()" [ngModel]="predicted()" (ngModelChange)="togglePredicted($event)" />
              Predicted results
            </label>
          </div>
        </div>

        @if (message()) {
          <p class="gpa-muted mt-2 text-sm" role="status">{{ message() }}</p>
        }

        <h2 class="mt-6 text-lg font-medium">Registered modules — Semester {{ semester() }}</h2>
        @if (busy() && drafts().length === 0) {
          <p class="mt-2 text-sm text-slate-500">Loading courses…</p>
        } @else if (drafts().length === 0) {
          <p class="mt-2 text-sm text-slate-500">No registered modules found for your profile/semester.</p>
        } @else {
          <p class="mt-2 text-sm text-slate-600">Save each course grade to keep it after refreshing.</p>
        }

        <div class="mt-3 space-y-3">
          @for (d of drafts(); track d.course.id) {
            <div class="gpa-panel p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="gpa-muted font-mono text-sm">{{ d.course.code }}</span>
                  <span class="ml-2 font-medium">{{ d.course.title }}</span>
                  <span class="gpa-muted ml-2 text-xs">({{ d.course.credits ?? '—' }} cr)</span>
                </div>
                <div class="flex items-center gap-2">
                  <select
                    class="gpa-control text-sm"
                    [attr.aria-label]="'Grade for ' + d.course.code"
                    [disabled]="busy()"
                    [ngModel]="d.letterGrade"
                    (ngModelChange)="editGrade(d, $event)"
                  >
                    <option [ngValue]="''">Select grade</option>
                    @for (g of gradeScale; track g.grade) {
                      <option [ngValue]="g.grade">{{ g.grade }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    class="gpa-button text-sm"
                    [disabled]="busy() || !d.letterGrade || !hasGradeEdit(d.course.id)"
                    (click)="save(d)"
                  >
                    {{ d.resultId ? 'Update' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <h2 class="mt-8 text-lg font-medium">Saved {{ predicted() ? 'predicted' : 'actual' }} results</h2>
        <div class="gpa-panel mt-3 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="gpa-muted text-left">
              <tr>
                <th class="px-3 py-2">Code</th><th class="px-3 py-2">Module</th>
                <th class="px-3 py-2">Year</th><th class="px-3 py-2">Sem</th>
                <th class="px-3 py-2">Grade</th>
                <th class="px-3 py-2">GP</th><th class="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of results(); track r.id) {
                <tr class="gpa-divider border-t">
                  <td class="px-3 py-2 font-mono">{{ r.courseCode }}</td>
                  <td class="px-3 py-2">{{ r.courseTitle }}</td>
                  <td class="px-3 py-2">{{ r.academicYear }}</td>
                  <td class="px-3 py-2">{{ r.semester }}</td>
                  <td class="px-3 py-2">{{ r.letterGrade ?? '—' }}</td>
                  <td class="px-3 py-2">{{ r.gradePoint ?? '—' }}</td>
                  <td class="px-3 py-2 space-x-2">
                    <button class="gpa-accent hover:underline" [disabled]="busy()" (click)="edit(r)">Edit</button>
                    <button class="text-red-400 hover:underline" [disabled]="busy()" (click)="remove(r)">Delete</button>
                    <button class="gpa-muted hover:underline" [disabled]="busy()" (click)="addRepeat(r)">Repeat</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-6">
          <button type="button" [disabled]="busy() || !courses().length" (click)="calculateCloud()"
            class="gpa-button text-sm">
            Calculate GPA
          </button>
          @if (cloudGpa(); as totals) {
            <div class="gpa-panel mt-4 flex flex-wrap gap-8 p-4" role="status">
              <div><p class="gpa-muted text-sm">Semester {{ semester() }} GPA</p><p class="text-2xl font-semibold">{{ fmt(totals.semester) }}</p></div>
              <div><p class="gpa-muted text-sm">Total GPA</p><p class="text-2xl font-semibold">{{ fmt(totals.total) }}</p></div>
            </div>
            @if (totals.total === null) { <p class="mt-2 text-sm text-slate-600">Select grades for courses that count toward GPA.</p> }
          }
        </div>
      </section>
    } @else {
      <section>
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900">GPA Calculator</h1>
            <p class="mt-1 text-sm text-slate-500">
              Select a grade for each course.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label class="flex items-center gap-2">
              Department
              <select
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5"
                [ngModel]="localDept()"
                (ngModelChange)="selectDept($event)"
              >
                @for (d of departments; track d.code) {
                  <option [ngValue]="d.code">{{ d.code }}</option>
                }
              </select>
            </label>
            <label class="flex items-center gap-2">
              Semester
              <select
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5"
                [ngModel]="localSemester()"
                (ngModelChange)="selectSemester($event)"
              >
                @for (s of [1,2,3,4,5,6,7,8]; track s) {
                  <option [ngValue]="s">{{ s }}</option>
                }
              </select>
            </label>
          </div>
        </div>

        <p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          Local Development Mode — grades are stored in this browser.
        </p>

        @if (localMessage()) {
          <p class="mt-2 text-sm text-slate-600">{{ localMessage() }}</p>
        }

        @if (localElectives().length > 0) {
          <div class="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-medium text-slate-800">Electives — Semester {{ localSemester() }}</h3>
              <span class="text-xs text-slate-500">
                Required: {{ localRequiredElectiveCredits() ?? '—' }} cr
              </span>
            </div>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              @for (c of localElectives(); track c.code) {
                <label class="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    [ngModel]="isElectiveSelected(c.code)"
                    (ngModelChange)="toggleElective(c.code, $event)"
                  />
                  <span class="font-mono text-xs text-slate-500">{{ c.code }}</span>
                  <span>{{ c.title }}</span>
                  <span class="text-xs text-slate-400">{{ c.credits ?? '—' }} cr</span>
                </label>
              }
            </div>
            @if (electiveMessage()) {
              <p class="mt-2 text-xs text-amber-700">{{ electiveMessage() }}</p>
            }
          </div>
        }

        <h2 class="mt-8 text-lg font-medium text-slate-800">Modules — Semester {{ localSemester() }}</h2>
        @if (localDrafts().length === 0) {
          <p class="mt-2 text-sm text-slate-500">Loading modules…</p>
        }
        <div class="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-left text-slate-600">
              <tr>
                <th class="px-3 py-2">Course Code</th>
                <th class="px-3 py-2">Course Name</th>
                <th class="px-3 py-2 text-right">Credits</th>
                <th class="px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              @for (d of localDrafts(); track d.course.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 font-mono text-slate-600">{{ d.course.code }}</td>
                  <td class="px-3 py-2">{{ d.course.title }}</td>
                  <td class="px-3 py-2 text-right">{{ d.course.credits ?? '—' }}</td>
                  <td class="px-3 py-2">
                    @if (d.course.gpaEligible) {
                      <select
                        class="rounded-lg border border-slate-300 px-2 py-1"
                        [ngModel]="d.letterGrade"
                        (ngModelChange)="onGradeChange(d, $event)"
                      >
                        <option [ngValue]="''">Select grade</option>
                        @for (g of gradeScale; track g.grade) {
                          <option [ngValue]="g.grade">{{ g.grade }}</option>
                        }
                      </select>
                    } @else {
                      <span class="mr-2 text-xs text-slate-500">Non-GPA</span>
                      <label class="inline-flex items-center gap-1 text-xs text-slate-500">
                        <input type="checkbox" [ngModel]="d.completed" (ngModelChange)="d.completed = $event" />
                        Completed
                      </label>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (localResults().length > 0) {
          <h2 class="mt-8 text-lg font-medium text-slate-800">Entered results</h2>
          <div class="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
            <table class="w-full text-sm">
              <thead class="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th class="px-3 py-2">Code</th><th class="px-3 py-2">Module</th>
                <th class="px-3 py-2">Sem</th>
                  <th class="px-3 py-2">Grade</th><th class="px-3 py-2">GP</th>
                  <th class="px-3 py-2">Counts</th><th class="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (r of localResults(); track r.id) {
                  <tr class="border-t border-slate-100">
                    <td class="px-3 py-2 font-mono">{{ r.courseCode }}</td>
                    <td class="px-3 py-2">{{ r.courseTitle }}</td>
                    <td class="px-3 py-2">{{ r.semester }}</td>
                    <td class="px-3 py-2">{{ r.letterGrade ?? '—' }}</td>
                    <td class="px-3 py-2">{{ r.gradePoint ?? '—' }}</td>
                    <td class="px-3 py-2">{{ r.countsTowardGpa ? 'Yes' : 'No' }}</td>
                    <td class="px-3 py-2">
                      <button class="text-red-600 hover:underline" (click)="removeLocal(r)">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <button
          type="button"
          class="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          (click)="calculate()"
        >
          Calculate GPA
        </button>

        @if (calculated()) {
          <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status">
            @for (card of localCards(); track card.label) {
              <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <span class="text-sm text-slate-500">{{ card.label }}</span>
                <div class="mt-2 text-3xl font-semibold tracking-tight">{{ card.value }}</div>
                @if (card.hint) { <div class="mt-1 text-xs text-slate-400">{{ card.hint }}</div> }
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class GpaComponent {
  private readonly profiles = inject(ProfileService);
  private readonly records = inject(StudentRecordsService);
  private readonly local = inject(LocalCurriculumService);
  private readonly gpa = inject(GpaCalculationService);
  private readonly electives = inject(ElectiveService);

  readonly supabaseMode = isSupabaseConfigured;
  readonly gradeScale = OFFICIAL_GRADE_SCALE;
  readonly semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  // Supabase mode state
  readonly predicted = signal(false);
  readonly semester = signal(1);
  readonly courses = signal<Course[]>([]);
  readonly busy = signal(true);
  readonly cloudGpa = signal<{ semester: number | null; total: number | null } | null>(null);
  readonly message = signal<string | null>(null);
  private readonly savedResults = signal<CourseResult[]>([]);
  private readonly gradeEdits = signal(new Map<string, GradeEdit>());
  readonly results = computed(() => this.savedResults().filter((r) => r.isPredicted === this.predicted()));
  private readonly cloudDrafts = computed(() => {
    const byCourse = new Map<string, CourseResult>();
    const byId = new Map<string, CourseResult>();
    for (const result of this.results()) {
      const previous = byCourse.get(result.courseId);
      if (!previous || result.academicYear >= previous.academicYear) byCourse.set(result.courseId, result);
      byId.set(result.id, result);
    }
    return this.courses().map((course): CloudDraft => {
      const change = this.gradeEdits().get(this.gradeKey(course.id));
      const saved = (change?.resultId ? byId.get(change.resultId) : undefined) ?? byCourse.get(course.id);
      const letterGrade = change?.letterGrade ?? saved?.letterGrade ??
        (saved?.marks == null ? '' : gradeForMarks(saved.marks) ?? '');
      const gradePoint = this.gradeScale.find((band) => band.grade === letterGrade)?.gradePoint ?? null;
      return { course, letterGrade, gradePoint, resultId: saved?.id, academicYear: saved?.academicYear };
    });
  });
  readonly drafts = computed(() => this.cloudDrafts().filter((d) => d.course.semester === this.semester()));
  private profile: Profile | null = null;
  private electiveSelections = new Map<number, Set<string>>();

  // Local mode state
  readonly departments = this.local.departments;
  readonly localDept = signal<DepartmentCode>('IS');
  readonly localSemester = signal(1);
  readonly localDrafts = signal<Draft[]>([]);
  readonly localResults = signal<CourseResult[]>([]);
  readonly localMessage = signal<string | null>(null);
  readonly calculated = signal(false);
  readonly localElectives = signal<Course[]>([]);
  readonly localRequiredElectiveCredits = signal<number | null>(null);
  readonly selectedElectives = signal<Set<string>>(new Set());
  readonly electiveMessage = signal<string | null>(null);
  private localCounter = 0;
  private readonly storageKey = 'smart-gpa-local-v1';
  private electiveStore: Record<string, string[]> = {};
  private storedDepts = new Set<string>();

  constructor() {
    if (this.supabaseMode) {
      this.load();
    } else {
      this.restoreLocal();
      this.loadLocal();
    }
  }

  // ---------- Supabase mode ----------
  private async load(): Promise<void> {
    try {
      const profile = await this.profiles.getMyProfile();
      if (!profile) {
        this.message.set('Sign in to load your grades.');
        return;
      }
      this.profile = profile;
      this.semester.set(profile.currentSemester ?? 1);
      const [courses, actual, predicted] = await Promise.all([
        this.records.getRegisteredModules(profile),
        this.records.getResults(profile.id),
        this.records.getResults(profile.id, true),
      ]);
      const results = [...actual, ...predicted];
      const years = new Set([this.currentAcademicYear(), ...results.map((r) => r.academicYear)]);
      const selections = await Promise.all([...years].map(async (year) =>
        [year, new Set(await this.electives.getSelections(profile.id, year))] as const,
      ));
      this.electiveSelections = new Map(selections);
      this.savedResults.set(results);
      this.courses.set(courses);
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  selectCloudSemester(value: number): void {
    this.semester.set(value);
    this.cloudGpa.set(null);
    this.message.set(null);
  }

  togglePredicted(value: boolean): void {
    this.predicted.set(value);
    this.cloudGpa.set(null);
    this.message.set(null);
  }

  private gradeKey(courseId: string): string {
    return `${this.predicted()}:${courseId}`;
  }

  hasGradeEdit(courseId: string): boolean {
    return this.gradeEdits().has(this.gradeKey(courseId));
  }

  private setGradeEdit(courseId: string, edit?: GradeEdit): void {
    const key = this.gradeKey(courseId);
    this.gradeEdits.update((edits) => {
      const next = new Map(edits);
      if (edit) next.set(key, edit);
      else next.delete(key);
      return next;
    });
  }

  editGrade(draft: Draft, letterGrade: string): void {
    this.setGradeEdit(draft.course.id, letterGrade ? { letterGrade, resultId: draft.resultId } : undefined);
    this.cloudGpa.set(null);
  }

  async save(d: CloudDraft): Promise<void> {
    if (!this.profile || this.busy() || !d.letterGrade || !this.hasGradeEdit(d.course.id)) return;
    const existing = this.results().find((r) => r.id === d.resultId);
    if (existing?.letterGrade === d.letterGrade) {
      this.setGradeEdit(d.course.id);
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      const saved = await this.records.saveResult({
        studentId: this.profile.id,
        courseId: d.course.id,
        semester: d.course.semester,
        academicYear: existing?.academicYear ?? this.currentAcademicYear(),
        letterGrade: d.letterGrade,
        countsTowardGpa: d.course.gpaEligible && d.course.credits != null && this.isSelectedForGpa(d),
        isPredicted: this.predicted(),
        id: d.resultId,
      });
      this.savedResults.update((results) => [...results.filter((r) => r.id !== saved.id), saved]);
      this.setGradeEdit(d.course.id);
      this.message.set(`Saved ${saved.courseCode}.`);
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  edit(r: CourseResult): void {
    if (!this.courses().some((course) => course.id === r.courseId)) {
      this.message.set('This result belongs to a different curriculum.');
      return;
    }
    this.selectCloudSemester(r.semester);
    const grade = r.letterGrade ?? (r.marks == null ? '' : gradeForMarks(r.marks) ?? '');
    this.setGradeEdit(r.courseId, { letterGrade: grade, resultId: r.id });
  }

  async remove(r: CourseResult): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.records.deleteResult(r.id);
      this.savedResults.update((results) => results.filter((result) => result.id !== r.id));
      if (this.gradeEdits().get(this.gradeKey(r.courseId))?.resultId === r.id) this.setGradeEdit(r.courseId);
      this.cloudGpa.set(null);
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async addRepeat(r: CourseResult): Promise<void> {
    if (this.busy()) return;
    const input = window.prompt(`Repeat attempt marks for ${r.courseCode}:`);
    if (input == null) return;
    const marks = Number(input);
    if (Number.isNaN(marks)) return;
    this.busy.set(true);
    try {
      const resolution = await this.records.addRepeatAttempt(
        r.id,
        (await this.records.getRepeats(r.id)).length + 1,
        marks,
      );
      this.message.set(
        `Repeat resolved: ${resolution.success ? 'successful' : 'unsuccessful'}, effective GP ${resolution.effectiveGradePoint}.`,
      );
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  calculateCloud(): void {
    const modules = this.cloudDrafts().map((draft) => ({
      semester: draft.course.semester,
      credits: draft.course.credits,
      gradePoint: draft.gradePoint,
      isGpaEligible: draft.course.gpaEligible,
      isElective: draft.course.isElective,
      isSelected: this.isSelectedForGpa(draft),
      hasResult: draft.gradePoint !== null,
    }));
    this.cloudGpa.set({
      semester: this.gpa.semesterGpa(modules.filter((module) => module.semester === this.semester())),
      total: this.gpa.semesterGpa(modules),
    });
  }

  private isSelectedForGpa(draft: CloudDraft): boolean {
    const year = draft.academicYear ?? this.currentAcademicYear();
    return !draft.course.isElective || (this.electiveSelections.get(year)?.has(draft.course.id) ?? false);
  }

  // ---------- Local mode ----------
  private async loadLocal(): Promise<void> {
    this.localMessage.set(null);
    this.electiveMessage.set(null);
    try {
      const curriculum = await this.local.load(this.localDept());
      const sem = curriculum.semesters.find((s) => s.semester === this.localSemester());
      const drafts: Draft[] = (sem?.courses ?? []).map((c) => ({
        course: {
          id: c.code,
          code: c.code,
          title: c.name,
          credits: c.credits,
          category: c.category as Course['category'],
          semester: (sem?.semester ?? 1) as Course['semester'],
          year: Math.ceil((sem?.semester ?? 1) / 2),
          prerequisites: [],
          hasPractical: false,
          gpaEligible: c.gpaEligible,
          isElective: c.isElective,
        },
        letterGrade: '',
        gradePoint: null,
      }));
      this.localDrafts.set(drafts);
      const electives = drafts.filter((d) => d.course.isElective).map((d) => d.course);
      this.localElectives.set(electives);
      this.localRequiredElectiveCredits.set(sem?.requiredElectiveCredits ?? null);
      this.ensureElectiveDefaults(electives);
      this.restoreDraftGrades();
    } catch (e) {
      this.localMessage.set(`Failed to load curriculum: ${(e as Error).message}`);
    }
  }

  private ensureElectiveDefaults(electives: Course[]): void {
    if (this.storedDepts.has(this.localDept()) || this.localDept() === 'DS') return;
    this.selectedElectives.set(new Set(electives.map((c) => c.code)));
    this.storedDepts.add(this.localDept());
    this.persistLocal();
  }

  /** Reflect saved local grades back into the draft rows. */
  private restoreDraftGrades(): void {
    const byCode = new Map(this.localResults().map((r) => [r.courseCode, r]));
    this.localDrafts.update((drafts) =>
      drafts.map((d) => {
        const r = byCode.get(d.course.code);
        return { ...d, letterGrade: r?.letterGrade ?? '', gradePoint: r?.gradePoint ?? null, resultId: r?.id };
      }),
    );
  }

  private restoreLocal(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw) as { results?: CourseResult[]; electives?: Record<string, string[]> };
      this.localResults.set(data.results ?? []);
      this.electiveStore = data.electives ?? {};
      this.storedDepts = new Set(Object.keys(this.electiveStore));
      this.selectedElectives.set(new Set(this.electiveStore[this.localDept()] ?? []));
    } catch {
      /* ignore corrupt local state */
    }
  }

  private persistLocal(): void {
    this.electiveStore[this.localDept()] = [...this.selectedElectives()];
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({ results: this.localResults(), electives: this.electiveStore }),
    );
  }

  isElectiveSelected(code: string): boolean {
    return this.selectedElectives().has(code);
  }

  toggleElective(code: string, checked: boolean): void {
    const next = new Set(this.selectedElectives());
    if (checked) next.add(code);
    else next.delete(code);
    this.selectedElectives.set(next);
    this.persistLocal();
    this.recomputeElectiveCounts();
    this.validateElectives();
  }

  private recomputeElectiveCounts(): void {
    this.localResults.set(
      this.localResults().map((r) => {
        const d = this.localDrafts().find((x) => x.course.code === r.courseCode);
        if (!d) return r;
        const selected = !d.course.isElective || this.selectedElectives().has(d.course.code);
        return {
          ...r,
          countsTowardGpa: d.course.gpaEligible && d.course.credits != null && selected,
        };
      }),
    );
  }

  private validateElectives(): void {
    const required = this.localRequiredElectiveCredits();
    if (required == null || this.localElectives().length === 0) {
      this.electiveMessage.set(null);
      return;
    }
    const selectedCredits = this.localElectives()
      .filter((c) => this.selectedElectives().has(c.code))
      .reduce((s, c) => s + (c.credits ?? 0), 0);
    if (this.localDept() === 'DS' && selectedCredits < required) {
      this.electiveMessage.set(`Select at least ${required} elective credits (currently ${selectedCredits}).`);
    } else {
      this.electiveMessage.set(null);
    }
  }

  selectDept(code: DepartmentCode): void {
    this.localDept.set(code);
    this.calculated.set(false);
    this.selectedElectives.set(new Set(this.electiveStore[code] ?? []));
    this.loadLocal();
  }

  selectSemester(sem: number): void {
    this.localSemester.set(sem);
    this.calculated.set(false);
    this.loadLocal();
  }

  calculate(): void {
    this.calculated.set(true);
  }

  removeLocal(r: CourseResult): void {
    this.localResults.set(this.localResults().filter((x) => x.id !== r.id));
    this.persistLocal();
    this.restoreDraftGrades();
  }

  localCards(): { label: string; value: string; hint?: string }[] {
    const results = this.localResults();
    const sem = this.localSemester();
    const semGpa = this.gpa.semesterGpa(this.toModules(results.filter((r) => r.semester === sem)));
    const year = Math.ceil(sem / 2);
    const yearGpa = this.gpa.semesterGpa(this.toModules(results.filter((r) => Math.ceil(r.semester / 2) === year)));
    const yearGpas = [1, 2, 3, 4].map((y) =>
      this.gpa.semesterGpa(this.toModules(results.filter((r) => Math.ceil(r.semester / 2) === y))),
    );
    const provisional = this.gpa.officialFgpa(yearGpas);
    const known = yearGpas.filter((g): g is number => g != null);
    const fill = known.length ? known.reduce((s, g) => s + g, 0) / known.length : 0;
    const expected = this.gpa.projectedFgpa(yearGpas.map((g) => g ?? fill));

    return [
      { label: 'Semester GPA', value: this.fmt(semGpa), hint: `Semester ${sem}` },
      { label: 'Year GPA', value: this.fmt(yearGpa), hint: `Year ${year}` },
      {
        label: 'Provisional FGPA',
        value: this.fmt(provisional),
        hint: provisional == null ? 'Incomplete years' : this.gpa.classify(provisional),
      },
      { label: 'Expected FGPA', value: this.fmt(expected), hint: 'Projection' },
    ];
  }

  private toModules(results: CourseResult[]): GpaModuleInput[] {
    return results.map((r) => ({
      credits: r.credits,
      gradePoint: r.gradePoint,
      isGpaEligible: r.countsTowardGpa,
      isElective: false,
      isSelected: true,
      hasResult: true,
    }));
  }

  fmt(v: number | null): string {
    return v == null ? '—' : v.toFixed(2);
  }

  private currentAcademicYear(): number {
    return new Date().getFullYear();
  }

  onGradeChange(d: Draft, grade: string): void {
    d.letterGrade = grade;
    const band = this.gradeScale.find((g) => g.grade === grade);
    d.gradePoint = band ? band.gradePoint : null;
    this.upsertLocal(d);
  }

  /** Add/update a temporary in-memory result from a grade selection. */
  private upsertLocal(d: Draft): void {
    if (!d.letterGrade) {
      this.localResults.set(this.localResults().filter((r) => r.courseId !== d.course.id));
      d.resultId = undefined;
      this.persistLocal();
      return;
    }
    const counts = d.course.gpaEligible && d.course.credits != null &&
      (!d.course.isElective || this.selectedElectives().has(d.course.code));
    const result: CourseResult = {
      id: d.resultId ?? `local-${++this.localCounter}`,
      studentId: 'local',
      courseId: d.course.id,
      courseCode: d.course.code,
      courseTitle: d.course.title,
      credits: d.course.credits,
      semester: d.course.semester,
      academicYear: this.currentAcademicYear(),
      marks: null,
      letterGrade: d.letterGrade,
      gradePoint: d.gradePoint,
      countsTowardGpa: counts,
      isPredicted: false,
    };
    const list = this.localResults().filter((r) => r.courseId !== d.course.id);
    list.push(result);
    this.localResults.set(list);
    d.resultId = result.id;
    this.persistLocal();
  }
}
