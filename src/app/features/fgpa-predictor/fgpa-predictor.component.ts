import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GpaService } from '../../services/gpa.service';

@Component({
  selector: 'app-fgpa-predictor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="text-2xl font-semibold">FGPA Predictor</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Enter expected year GPAs (including unfinished years). Projected FGPA uses the
      official 20/20/30/30 weighting and never treats missing years as zero.
    </p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (i of [0,1,2,3]; track i) {
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Year {{ i + 1 }} GPA
          <input type="number" min="0" max="4" step="0.01"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            [ngModel]="yearGpas()[i]" (ngModelChange)="setYear(i, $event)" />
        </label>
      }
    </div>

    <div class="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div class="text-sm text-slate-500 dark:text-slate-400">Projected FGPA</div>
      <div class="mt-1 text-4xl font-semibold text-brand-700 dark:text-brand-300">{{ projected() ?? '—' }}</div>
      @if (error()) { <p class="mt-2 text-sm text-red-600">{{ error() }}</p> }
    </div>
  `,
})
export class FgpaPredictorComponent {
  private readonly gpa = inject(GpaService);

  readonly yearGpas = signal<(number | null)[]>([null, null, null, null]);
  readonly projected = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  setYear(index: number, value: number | null): void {
    const next = [...this.yearGpas()];
    next[index] = value;
    this.yearGpas.set(next);
    this.compute();
  }

  private compute(): void {
    const values = this.yearGpas();
    if (values.some((v) => v == null)) {
      this.projected.set(null);
      this.error.set('Enter all four year GPAs to project.');
      return;
    }
    this.error.set(null);
    this.projected.set(this.gpa.projectedFgpa(values as number[]));
  }
}