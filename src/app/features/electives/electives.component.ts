import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course, Profile } from '../../models';
import { ElectiveService } from '../../services/elective.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-electives',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1 class="text-3xl font-bold tracking-tight">Elective Registration</h1>
      <p class="gpa-muted mt-2 text-sm">
        Select only the electives you actually registered for. Unselected electives are excluded from GPA.
      </p>

      @if (message()) {
        <p class="gpa-muted mt-2 text-sm" role="status">{{ message() }}</p>
      }

      <div class="mt-4 flex flex-wrap items-center gap-4">
        <label class="text-sm font-medium">
          Semester
          <select
            class="gpa-control ml-2"
            [ngModel]="semester()"
            (ngModelChange)="changeSemester($event)"
          >
            @for (s of semesters; track s) { <option [ngValue]="s">{{ s }}</option> }
          </select>
        </label>
        <span class="gpa-muted text-sm">
          Selected credits: <strong>{{ selectedCredits() }}</strong> / required {{ requiredCredits() }}
        </span>
      </div>

      <div class="mt-4 space-y-2">
        @for (c of electives(); track c.id) {
          <label class="gpa-panel flex flex-wrap items-center gap-3 p-3">
            <input
              type="checkbox"
              class="accent-[#76ff03]"
              [ngModel]="isSelected(c.id)"
              (ngModelChange)="toggle(c.id, $event)"
            />
            <span class="gpa-muted font-mono text-sm">{{ c.code }}</span>
            <span class="font-medium">{{ c.title }}</span>
            <span class="gpa-muted text-xs">{{ c.credits ?? '—' }} cr</span>
          </label>
        }
        @if (electives().length === 0) {
          <p class="gpa-muted text-sm">No electives listed for this semester.</p>
        }
      </div>

      <button
        type="button"
        class="gpa-button mt-6"
        [disabled]="saving()"
        (click)="save()"
      >
        {{ saving() ? 'Saving…' : 'Save selections' }}
      </button>
    </section>
  `,
})
export class ElectivesComponent {
  private readonly profiles = inject(ProfileService);
  private readonly electivesSvc = inject(ElectiveService);

  readonly semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly semester = signal(1);
  readonly electives = signal<Course[]>([]);
  readonly selected = signal<Set<string>>(new Set());
  readonly requiredCredits = signal(0);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);

  private profile: Profile | null = null;

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    this.profile = await this.profiles.getMyProfile();
    if (!this.profile?.departmentId || !this.profile.curriculumVersionId) return;
    this.semester.set(this.profile.currentSemester ?? 1);
    await this.reload();
  }

  private async reload(): Promise<void> {
    if (!this.profile?.departmentId || !this.profile.curriculumVersionId) return;
    const [courses, reqs, selections] = await Promise.all([
      this.electivesSvc.getElectiveCourses(
        this.profile.departmentId,
        this.profile.curriculumVersionId,
        this.semester(),
      ),
      this.electivesSvc.getRequirements(this.profile.departmentId),
      this.electivesSvc.getSelections(this.profile.id, this.currentYear()),
    ]);
    this.electives.set(courses);
    this.selected.set(new Set(selections));
    this.requiredCredits.set(reqs.find((r) => r.semester === this.semester())?.required_credits ?? 0);
  }

  async changeSemester(semester: number): Promise<void> {
    this.semester.set(semester);
    await this.reload();
  }

  isSelected(courseId: string): boolean {
    return this.selected().has(courseId);
  }

  toggle(courseId: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(courseId);
    else next.delete(courseId);
    this.selected.set(next);
  }

  selectedCredits(): number {
    return this.electives()
      .filter((c) => this.selected().has(c.id))
      .reduce((sum, c) => sum + (c.credits ?? 0), 0);
  }

  async save(): Promise<void> {
    if (!this.profile) return;
    const credits = this.selectedCredits();
    if (!this.electivesSvc.validateCredits(credits, this.requiredCredits())) {
      this.message.set(`Select at least ${this.requiredCredits()} elective credits (currently ${credits}).`);
      return;
    }
    this.saving.set(true);
    try {
      await this.electivesSvc.saveSelections(this.profile.id, [...this.selected()], this.currentYear());
      this.message.set('Selections saved.');
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }
}
