import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DepartmentOption, Profile } from '../../models';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  template: `
    <main class="gpa-auth mx-auto max-w-lg px-4 py-12 sm:py-20">
      <section class="gpa-panel p-6 sm:p-8">
        <h1 class="text-2xl font-bold">Choose your degree programme</h1>
        @if (error()) { <p role="alert" class="gpa-error mt-4 text-sm">{{ error() }}</p> }
        @if (loading()) { <p class="gpa-muted mt-4" role="status">Loading programmes…</p> }
        <div class="mt-6 grid gap-3">
          @for (programme of programmes(); track programme.id) {
            <button class="gpa-nav-link !justify-start"
              [attr.aria-pressed]="selected()?.id === programme.id" [disabled]="saving()"
              (click)="selected.set(programme)" type="button">
              {{ programme.name }} ({{ programme.code }})
            </button>
          }
        </div>
        <button type="button" class="gpa-button mt-6 w-full" [disabled]="!selected() || saving()"
          (click)="save()">{{ saving() ? 'Saving…' : 'Continue to dashboard' }}</button>
      </section>
    </main>
  `,
})
export class OnboardingComponent {
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private profile: Profile | null = null;
  readonly programmes = signal<DepartmentOption[]>([]);
  readonly selected = signal<DepartmentOption | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.profile = await this.profiles.getMyProfile();
      if (this.profiles.needsOnboarding(this.profile) === false) {
        await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        return;
      }
      const departments = await this.profiles.getDepartments();
      const ordered = ['IS', 'SE', 'DS'].flatMap((code) => departments.filter((d) => d.code === code));
      this.programmes.set(this.profile?.departmentId
        ? ordered.filter((d) => d.id === this.profile?.departmentId)
        : ordered);
      if (!this.programmes().length) this.error.set('No degree programmes are available. Check the curriculum setup.');
    } catch {
      this.error.set('Could not load degree programmes. Refresh to try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const programme = this.selected();
    if (!programme || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const versions = await this.profiles.getCurriculumVersions(programme.id);
      const curriculum = versions.find((v) => v.version === 'official') ?? (versions.length === 1 ? versions[0] : undefined);
      if (!curriculum) throw new Error('The official curriculum for this programme is unavailable.');
      await this.profiles.saveOnboarding({
        departmentId: programme.id,
        curriculumVersionId: curriculum.id,
        currentSemester: this.profile?.currentSemester ?? 1,
      });
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save your programme. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
