import { Component, inject, signal } from '@angular/core';
import { CourseResult, GpaModuleInput } from '../../models';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { GpaService } from '../../services/gpa.service';

@Component({
  selector: 'app-year-gpa',
  standalone: true,
  template: `
    <h1 class="text-2xl font-semibold">Year GPA</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Each year GPA is the combined credit-weighted result of its two semesters.
    </p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (y of years(); track y.year) {
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div class="text-sm text-slate-500 dark:text-slate-400">Year {{ y.year }} · Sem {{ y.semesters }}</div>
          <div class="mt-2 text-3xl font-semibold">{{ y.gpa ?? '—' }}</div>
          @if (y.gpa === null) { <div class="mt-1 text-xs text-amber-600 dark:text-amber-400">Incomplete</div> }
        </div>
      }
    </div>

    @if (fgpa() !== null) {
      <p class="mt-6 text-sm text-slate-600 dark:text-slate-300">
        Provisional FGPA (official weighting): <strong>{{ fgpa() }}</strong>
      </p>
    } @else {
      <p class="mt-6 text-sm text-slate-500 dark:text-slate-400">Provisional FGPA available once all four years are complete.</p>
    }
  `,
})
export class YearGpaComponent {
  private readonly profiles = inject(ProfileService);
  private readonly records = inject(StudentRecordsService);
  private readonly gpa = inject(GpaService);

  readonly years = signal<{ year: number; semesters: string; gpa: number | null }[]>([]);
  readonly fgpa = signal<number | null>(null);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const profile = await this.profiles.getMyProfile();
    if (!profile) return;
    const results = await this.records.getResults(profile.id, false);
    const yearGpas = [1, 2, 3, 4].map((year) => {
      const sems = [year * 2 - 1, year * 2];
      const subset = results.filter((r) => sems.includes(r.semester));
      return { year, semesters: `${sems[0]}+${sems[1]}`, gpa: this.gpa.semesterGpa(this.toModules(subset)) };
    });
    this.years.set(yearGpas);
    this.fgpa.set(this.gpa.officialFgpa(yearGpas.map((y) => y.gpa)));
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
}