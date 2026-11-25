import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Course,
  CourseResult,
  GpaModuleInput,
  Profile,
  ScenarioAssumptions,
  ScenarioResult,
} from '../../models';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { ElectiveService } from '../../services/elective.service';
import { PredictionService } from '../../services/prediction.service';
import { GpaService } from '../../services/gpa.service';
import { OFFICIAL_GRADE_SCALE } from '../../services/gpa';

interface ExpectedRow {
  course: Course;
  hasResult: boolean;
  actualGrade: string;
  expectedGrade: string;
}

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="text-2xl font-semibold">GPA Predictions</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Enter expected grades for modules without official results. These are
      <strong>predictions</strong> and never overwrite actual results.
    </p>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 class="text-lg font-medium">Expected results — Semester {{ semester() }}</h2>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead class="text-left text-slate-500 dark:text-slate-400">
              <tr><th class="py-2">Code</th><th class="py-2">Module</th><th class="py-2">Credits</th><th class="py-2">Actual</th><th class="py-2">Expected</th></tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.course.id) {
                <tr class="border-t border-slate-100 dark:border-slate-800">
                  <td class="py-2 font-mono text-slate-500">{{ row.course.code }}</td>
                  <td class="py-2">{{ row.course.title }}</td>
                  <td class="py-2">{{ row.course.credits ?? '—' }}</td>
                  <td class="py-2">{{ row.actualGrade || '—' }}</td>
                  <td class="py-2">
                    @if (row.hasResult) {
                      <span class="text-xs text-slate-400">actual</span>
                    } @else {
                      <select class="rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                        [ngModel]="row.expectedGrade" (ngModelChange)="setExpected(row, $event)">
                        <option [ngValue]="''">Expected</option>
                        @for (g of gradeScale; track g.grade) { <option [ngValue]="g.grade">{{ g.grade }}</option> }
                      </select>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (rows().length === 0) { <p class="py-6 text-center text-sm text-slate-500">No modules.</p> }
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div class="text-sm text-slate-500 dark:text-slate-400">Expected Semester GPA</div>
          <div class="mt-1 text-3xl font-semibold text-brand-700 dark:text-brand-300">{{ expectedSemGpa() ?? '—' }}</div>
        </div>
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h3 class="text-sm font-medium">Scenario assumptions (grade point)</h3>
          <div class="mt-2 space-y-2">
            @for (s of scenarios(); track s.key) {
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600 dark:text-slate-300">{{ s.label }}</span>
                <span class="font-medium">FGPA {{ s.projectedFgpa }} · {{ s.expectedClass }}</span>
              </div>
            }
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <input type="number" min="0" max="4" step="0.1" class="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" [ngModel]="assumptions().conservative" (ngModelChange)="setAssumption('conservative', $event)" />
            <input type="number" min="0" max="4" step="0.1" class="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" [ngModel]="assumptions().realistic" (ngModelChange)="setAssumption('realistic', $event)" />
            <input type="number" min="0" max="4" step="0.1" class="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800" [ngModel]="assumptions().optimistic" (ngModelChange)="setAssumption('optimistic', $event)" />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PredictionsComponent {
  private readonly profiles = inject(ProfileService);
  private readonly records = inject(StudentRecordsService);
  private readonly electives = inject(ElectiveService);
  private readonly prediction = inject(PredictionService);
  private readonly gpa = inject(GpaService);

  readonly gradeScale = OFFICIAL_GRADE_SCALE;
  readonly semester = signal(1);
  readonly rows = signal<ExpectedRow[]>([]);
  readonly expectedSemGpa = signal<number | null>(null);
  readonly assumptions = signal<ScenarioAssumptions>({ conservative: 2.0, realistic: 3.0, optimistic: 3.7 });
  readonly scenarios = signal<ScenarioResult[]>([]);

  private profile: Profile | null = null;
  private modules: Course[] = [];
  private results: CourseResult[] = [];
  private selectedIds: string[] = [];

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.profile = await this.profiles.getMyProfile();
    if (!this.profile) return;
    this.semester.set(this.profile.currentSemester ?? 1);
    const [modules, results, selected] = await Promise.all([
      this.records.getRegisteredModules(this.profile),
      this.records.getResults(this.profile.id, false),
      this.electives.getSelections(this.profile.id, new Date().getFullYear()),
    ]);
    this.modules = modules;
    this.results = results;
    this.selectedIds = selected;
    this.rebuildRows();
    this.recompute();
  }

  private rebuildRows(): void {
    const sem = this.semester();
    const resultByCourse = new Map(this.results.map((r) => [r.courseId, r]));
    const rows = this.modules
      .filter((m) => m.semester === sem)
      .map((course) => {
        const r = resultByCourse.get(course.id);
        return {
          course,
          hasResult: !!r,
          actualGrade: r?.letterGrade ?? '',
          expectedGrade: '',
        } as ExpectedRow;
      });
    this.rows.set(rows);
  }

  setExpected(row: ExpectedRow, grade: string): void {
    row.expectedGrade = grade;
    this.recompute();
  }

  setAssumption(key: keyof ScenarioAssumptions, value: number): void {
    this.assumptions.set({ ...this.assumptions(), [key]: value });
    this.recompute();
  }

  private recompute(): void {
    if (!this.profile) return;
    const sem = this.semester();
    const resultByCourse = new Map(this.results.map((r) => [r.courseId, r]));
    const modules: GpaModuleInput[] = [];
    for (const row of this.rows()) {
      const r = resultByCourse.get(row.course.id);
      if (r) {
        modules.push({ credits: r.credits, gradePoint: r.gradePoint, isGpaEligible: r.countsTowardGpa, isElective: false, isSelected: true, hasResult: true });
      } else if (row.expectedGrade) {
        const band = this.gradeScale.find((g) => g.grade === row.expectedGrade);
        if (band && row.course.gpaEligible !== false && row.course.credits != null) {
          modules.push({ credits: row.course.credits, gradePoint: band.gradePoint, isGpaEligible: true, isElective: row.course.isElective, isSelected: true, hasResult: true });
        }
      }
    }
    this.expectedSemGpa.set(this.prediction.expectedSemesterGpa(modules));

    const selected = this.selectedIds;
    const input = this.prediction.buildInput(this.modules, this.results, selected);
    this.scenarios.set(this.prediction.scenarios(input, this.assumptions()));
  }
}