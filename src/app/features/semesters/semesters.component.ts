import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Course, CourseResult, Profile } from '../../models';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { ElectiveService } from '../../services/elective.service';
import { GpaService } from '../../services/gpa.service';
import { gradeForMarks, gradePointForMarks, OFFICIAL_GRADE_SCALE } from '../../services/gpa';

interface Row {
  course: Course;
  marks: number | null;
  letterGrade: string;
  gradePoint: number | null;
  resultId?: string;
  isElective: boolean;
  isSelected: boolean;
  status: 'completed' | 'pending' | 'non-gpa';
}

@Component({
  selector: 'app-semesters',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    @if (semester() === null) {
      <h1 class="text-2xl font-semibold">Semester Results</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a semester to view and enter results.</p>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (s of semesters; track s) {
          <a [routerLink]="['/semesters', s]" class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-800">
            <div class="text-lg font-medium">Semester {{ s }}</div>
            <div class="mt-1 text-xs text-slate-400">Year {{ Math.ceil(s / 2) }}</div>
          </a>
        }
      </div>
    } @else {
      <div class="flex items-center justify-between">
        <div>
          <a routerLink="/semesters" class="text-sm text-brand-600 hover:underline">← All semesters</a>
          <h1 class="text-2xl font-semibold">Semester {{ semester() }}</h1>
        </div>
        <div class="text-right text-sm">
          <div class="text-slate-500 dark:text-slate-400">Semester GPA</div>
          <div class="text-2xl font-semibold">{{ gpaDisplay() }}</div>
        </div>
      </div>

      @if (message()) { <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">{{ message() }}</p> }

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        @for (stat of stats(); track stat.label) {
          <div class="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div class="text-xl font-semibold">{{ stat.value }}</div>
            <div class="text-xs text-slate-400">{{ stat.label }}</div>
          </div>
        }
      </div>

      <div class="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="bg-slate-50 text-left text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th class="px-3 py-3">Course Code</th>
              <th class="px-3 py-3">Course Name</th>
              <th class="px-3 py-3">Credits</th>
              <th class="px-3 py-3">Type</th>
              <th class="px-3 py-3">Marks / Grade</th>
              <th class="px-3 py-3">Grade Point</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.course.id) {
              <tr class="border-t border-slate-100 dark:border-slate-800">
                <td class="px-3 py-2 font-mono text-slate-500">{{ row.course.code }}</td>
                <td class="px-3 py-2">
                  {{ row.course.title }}
                  @if (row.status === 'non-gpa') { <span class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">Non-GPA</span> }
                  @if (row.isElective) { <span class="ml-1 rounded px-1.5 py-0.5 text-xs" [class]="row.isSelected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'">Elective · {{ row.isSelected ? 'selected' : 'unselected' }}</span> }
                </td>
                <td class="px-3 py-2">{{ row.course.credits ?? '—' }}</td>
                <td class="px-3 py-2 capitalize">{{ row.course.category }}</td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input type="number" min="0" max="100" placeholder="Marks"
                      class="w-20 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                      [ngModel]="row.marks" (ngModelChange)="onMarks(row, $event)" />
                    <select class="rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                      [ngModel]="row.letterGrade" (ngModelChange)="onGrade(row, $event)">
                      <option [ngValue]="''">Grade</option>
                      @for (g of gradeScale; track g.grade) { <option [ngValue]="g.grade">{{ g.grade }}</option> }
                    </select>
                    <button class="rounded-lg bg-brand-600 px-2 py-1 text-white hover:bg-brand-700" (click)="save(row)">{{ row.resultId ? 'Update' : 'Save' }}</button>
                  </div>
                </td>
                <td class="px-3 py-2 font-medium text-brand-700 dark:text-brand-300">{{ row.gradePoint ?? '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (rows().length === 0) {
          <div class="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No modules found for this semester.</div>
        }
      </div>
    }
  `,
})
export class SemestersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profiles = inject(ProfileService);
  private readonly records = inject(StudentRecordsService);
  private readonly electives = inject(ElectiveService);
  private readonly gpa = inject(GpaService);

  readonly semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly gradeScale = OFFICIAL_GRADE_SCALE;
  readonly semester = signal<number | null>(null);
  readonly rows = signal<Row[]>([]);
  readonly stats = signal<{ label: string; value: number }[]>([]);
  readonly gpaDisplay = signal('—');
  readonly message = signal<string | null>(null);

  private profile: Profile | null = null;
  readonly Math = Math;

  constructor() {
    const param = this.route.snapshot.paramMap.get('semester');
    const parsed = param ? Number(param) : NaN;
    this.semester.set(Number.isInteger(parsed) && parsed >= 1 && parsed <= 8 ? parsed : null);
    this.load();
  }

  private async load(): Promise<void> {
    this.profile = await this.profiles.getMyProfile();
    if (!this.profile || this.semester() === null) return;
    await this.reload();
  }

  private async reload(): Promise<void> {
    if (!this.profile || this.semester() === null) return;
    const sem = this.semester() as number;
    const [modules, results, electiveCourses, selectedIds] = await Promise.all([
      this.records.getRegisteredModules(this.profile, sem),
      this.records.getResults(this.profile.id, false),
      this.profile.departmentId && this.profile.curriculumVersionId
        ? this.electives.getElectiveCourses(this.profile.departmentId, this.profile.curriculumVersionId, sem)
        : Promise.resolve([] as Course[]),
      this.electives.getSelections(this.profile.id, new Date().getFullYear()),
    ]);

    const semResults = results.filter((r) => r.semester === sem);
    const byCourse = new Map(semResults.map((r) => [r.courseId, r]));
    const selected = new Set(selectedIds);
    const electiveIds = new Set(electiveCourses.map((c) => c.id));

    const rows: Row[] = modules.map((course) => {
      const r = byCourse.get(course.id);
      const isElective = electiveIds.has(course.id) || course.category === 'elective';
      const status: Row['status'] = course.gpaEligible === false ? 'non-gpa' : r ? 'completed' : 'pending';
      return {
        course,
        marks: r?.marks ?? null,
        letterGrade: r?.letterGrade ?? '',
        gradePoint: r?.gradePoint ?? null,
        resultId: r?.id,
        isElective,
        isSelected: selected.has(course.id),
        status,
      };
    });
    this.rows.set(rows);

    const completed = rows.filter((r) => r.status === 'completed').length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const nonGpa = rows.filter((r) => r.status === 'non-gpa').length;
    const selElect = rows.filter((r) => r.isElective && r.isSelected).length;
    const unselElect = rows.filter((r) => r.isElective && !r.isSelected).length;
    this.stats.set([
      { label: 'Completed', value: completed },
      { label: 'Pending', value: pending },
      { label: 'Non-GPA', value: nonGpa },
      { label: 'Selected electives', value: selElect },
      { label: 'Unselected electives', value: unselElect },
      { label: 'Completion %', value: rows.length ? Math.round((completed / rows.length) * 100) : 0 },
    ]);

    this.gpaDisplay.set(this.fmt(this.gpa.semesterGpa(this.toModules(semResults))));
  }

  onMarks(row: Row, marks: number | null): void {
    row.marks = marks;
    row.letterGrade = marks != null ? (gradeForMarks(marks) ?? '') : '';
    row.gradePoint = marks != null ? gradePointForMarks(marks) : null;
  }

  onGrade(row: Row, grade: string): void {
    row.letterGrade = grade;
    const band = this.gradeScale.find((g) => g.grade === grade);
    row.gradePoint = band ? band.gradePoint : null;
    row.marks = null;
  }

  async save(row: Row): Promise<void> {
    if (!this.profile) return;
    if (row.marks == null && !row.letterGrade) {
      this.message.set('Enter marks or select a grade.');
      return;
    }
    try {
      const saved = await this.records.saveResult({
        studentId: this.profile.id,
        courseId: row.course.id,
        semester: row.course.semester,
        academicYear: new Date().getFullYear(),
        marks: row.marks,
        letterGrade: row.letterGrade || null,
        isPredicted: false,
        id: row.resultId,
      });
      row.resultId = saved.id;
      this.message.set(`Saved ${saved.courseCode}.`);
      await this.reload();
    } catch (e) {
      this.message.set((e as Error).message);
    }
  }

  private toModules(results: CourseResult[]) {
    return results.map((r) => ({
      credits: r.credits,
      gradePoint: r.gradePoint,
      isGpaEligible: r.countsTowardGpa,
      isElective: false,
      isSelected: true,
      hasResult: true,
    }));
  }

  private fmt(v: number | null): string {
    return v == null ? '—' : v.toFixed(2);
  }
}