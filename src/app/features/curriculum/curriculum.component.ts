import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DepartmentCode,
  LocalCurriculum,
  LocalCurriculumService,
} from '../../services/local-curriculum.service';

@Component({
  selector: 'app-curriculum',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">Curriculum</h1>
          <p class="mt-1 text-sm text-slate-500">
            Official programme structure — all eight semesters.
          </p>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-600">
          Department
          <select
            class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            [ngModel]="department()"
            (ngModelChange)="selectDepartment($event)"
          >
            @for (d of departments; track d.code) {
              <option [ngValue]="d.code">{{ d.code }} — {{ d.name }}</option>
            }
          </select>
        </label>
      </div>

      @if (loading()) {
        <div class="mt-6 space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          }
        </div>
      } @else if (error()) {
        <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error() }}</p>
      } @else if (curriculum()) {
        <p class="mt-3 text-sm text-slate-500">
          {{ curriculum()!.degreeName }} · {{ curriculum()!.semesters.length }} semesters ·
          {{ totalModules() }} modules
        </p>

        <div class="mt-6 space-y-6">
          @for (sem of curriculum()!.semesters; track sem.semester) {
            <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <h2 class="text-lg font-medium">Semester {{ sem.semester }}</h2>
                <div class="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{{ sem.courses.length }} modules</span>
                  <span>Credits: {{ sem.officialTotalCredits }}</span>
                  @if (sem.requiredElectiveCredits != null) {
                    <span>Elective required: {{ sem.requiredElectiveCredits }} cr</span>
                  }
                </div>
              </div>
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/50">
                  <tr>
                    <th class="px-5 py-2">Code</th>
                    <th class="px-5 py-2">Module</th>
                    <th class="px-5 py-2">Category</th>
                    <th class="px-5 py-2 text-right">Credits</th>
                    <th class="px-5 py-2 text-right">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of sem.courses; track c.code) {
                    <tr class="border-t border-slate-100 dark:border-slate-800">
                      <td class="px-5 py-2 font-mono text-slate-600">{{ c.code }}</td>
                      <td class="px-5 py-2">{{ c.name }}</td>
                      <td class="px-5 py-2">
                        <span
                          class="rounded-full px-2 py-0.5 text-xs font-medium"
                          [class]="categoryClass(c.category)"
                        >{{ c.category }}</span>
                      </td>
                      <td class="px-5 py-2 text-right">{{ c.credits ?? '—' }}</td>
                      <td class="px-5 py-2 text-right">
                        @if (c.gpaEligible) {
                          <span class="text-emerald-600">Yes</span>
                        } @else {
                          <span class="text-slate-400">No</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class CurriculumComponent {
  private readonly local = inject(LocalCurriculumService);

  readonly departments = this.local.departments;
  readonly department = signal<DepartmentCode>('IS');
  readonly curriculum = signal<LocalCurriculum | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load('IS');
  }

  selectDepartment(code: DepartmentCode): void {
    this.department.set(code);
    this.load(code);
  }

  private async load(code: DepartmentCode): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.curriculum.set(await this.local.load(code));
    } catch (e) {
      this.error.set(`Failed to load ${code} curriculum: ${(e as Error).message}`);
    } finally {
      this.loading.set(false);
    }
  }

  totalModules(): number {
    return this.curriculum()?.semesters.reduce((s, sem) => s + sem.courses.length, 0) ?? 0;
  }

  categoryClass(category: string): string {
    switch (category) {
      case 'Core':
      case 'Compulsory':
        return 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300';
      case 'Elective':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
      case 'Compulsory (Non-GPA)':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}