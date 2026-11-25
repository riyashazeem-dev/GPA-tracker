import { Component, inject, signal } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { ThemeService } from '../../core/theme/theme.service';
import { chartTheme } from '../../shared/chart-theme';
import { ChartComponent } from '../../shared/components/chart.component';
import { CourseResult, GpaModuleInput } from '../../models';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { GpaService } from '../../services/gpa.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [ChartComponent],
  template: `
    <h1 class="text-2xl font-semibold">Academic Progress</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Live charts from your saved results.</p>

    @if (loading()) {
      <div class="mt-6 grid gap-4 lg:grid-cols-2">
        @for (i of [1,2,3,4]; track i) { <div class="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"></div> }
      </div>
    } @else {
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 class="mb-3 text-lg font-medium">Semester GPA</h2>
          @if (semesterChart()) { <app-chart [config]="semesterChart()!" [height]="280"></app-chart> }
          @else { <p class="text-sm text-slate-500">No results yet.</p> }
        </div>

        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 class="mb-3 text-lg font-medium">Year GPA comparison</h2>
          @if (yearChart()) { <app-chart [config]="yearChart()!" [height]="280"></app-chart> }
          @else { <p class="text-sm text-slate-500">No results yet.</p> }
        </div>

        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 class="mb-3 text-lg font-medium">Credit completion</h2>
          @if (creditChart()) { <app-chart [config]="creditChart()!" [height]="280"></app-chart> }
          @else { <p class="text-sm text-slate-500">No data.</p> }
        </div>

        <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h2 class="mb-3 text-lg font-medium">Grade distribution</h2>
          @if (gradeChart()) { <app-chart [config]="gradeChart()!" [height]="280"></app-chart> }
          @else { <p class="text-sm text-slate-500">No results yet.</p> }
        </div>
      </div>
    }
  `,
})
export class ProgressComponent {
  private readonly profiles = inject(ProfileService);
  private readonly records = inject(StudentRecordsService);
  private readonly gpa = inject(GpaService);
  private readonly theme = inject(ThemeService);

  readonly loading = signal(true);
  readonly semesterChart = signal<ChartConfiguration | null>(null);
  readonly yearChart = signal<ChartConfiguration | null>(null);
  readonly creditChart = signal<ChartConfiguration | null>(null);
  readonly gradeChart = signal<ChartConfiguration | null>(null);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const profile = await this.profiles.getMyProfile();
      if (!profile) return;
      const [results, modules, total] = await Promise.all([
        this.records.getResults(profile.id, false),
        this.records.getRegisteredModules(profile),
        profile.curriculumVersionId ? this.profiles.getTotalCredits(profile.curriculumVersionId) : Promise.resolve(null),
      ]);
      if (results.length === 0) {
        return;
      }
      this.buildCharts(results, modules, total);
    } finally {
      this.loading.set(false);
    }
  }

  private buildCharts(results: CourseResult[], modules: unknown[], total: number | null): void {
    const t = chartTheme(this.theme.theme());

    const semGpas = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) =>
      this.gpa.semesterGpa(this.toModules(results.filter((r) => r.semester === sem))),
    );
    this.semesterChart.set({
      type: 'line',
      data: {
        labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
        datasets: [
          {
            label: 'Semester GPA',
            data: semGpas,
            borderColor: t.brand,
            backgroundColor: 'rgba(50,124,255,0.15)',
            tension: 0.35,
            fill: true,
            spanGaps: true,
          },
        ],
      },
      options: this.options(t),
    });

    const yearGpas = [1, 2, 3, 4].map((y) =>
      this.gpa.semesterGpa(this.toModules(results.filter((r) => Math.ceil(r.semester / 2) === y))),
    );
    this.yearChart.set({
      type: 'bar',
      data: {
        labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
        datasets: [{ label: 'Year GPA', data: yearGpas, backgroundColor: t.series[0] }],
      },
      options: this.options(t),
    });

    const completed = results.filter((r) => r.countsTowardGpa).reduce((s, r) => s + (r.credits ?? 0), 0);
    const remaining = Math.max((total ?? completed) - completed, 0);
    this.creditChart.set({
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [{ data: [completed, remaining], backgroundColor: [t.series[0], t.grid] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: t.ticks } } } },
    });

    const gradeCounts = new Map<string, number>();
    for (const r of results) {
      if (r.letterGrade) gradeCounts.set(r.letterGrade, (gradeCounts.get(r.letterGrade) ?? 0) + 1);
    }
    const labels = [...gradeCounts.keys()];
    this.gradeChart.set({
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Modules', data: labels.map((l) => gradeCounts.get(l) ?? 0), backgroundColor: t.series[1] }],
      },
      options: this.options(t),
    });
  }

  private options(t: ReturnType<typeof chartTheme>): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: t.ticks } } },
      scales: {
        x: { grid: { color: t.grid }, ticks: { color: t.ticks } },
        y: { grid: { color: t.grid }, ticks: { color: t.ticks }, beginAtZero: true, max: 4 },
      },
    };
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