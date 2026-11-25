import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { Profile } from '../../models';

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    <h1 class="text-2xl font-semibold">Profile &amp; Settings</h1>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">Email</dt><dd class="font-medium">{{ profile()?.email ?? '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">Role</dt><dd class="font-medium capitalize">{{ profile()?.role ?? 'student' }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">Department</dt><dd class="font-medium">{{ profile()?.departmentId ?? '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">Current semester</dt><dd class="font-medium">{{ profile()?.currentSemester ?? '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">Intake year</dt><dd class="font-medium">{{ profile()?.intakeYear ?? '—' }}</dd></div>
        </dl>
      </div>

      <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 class="text-lg font-medium">Appearance</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Current: {{ themeLabel() }} mode</p>
        <button
          type="button"
          class="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          (click)="toggleTheme()"
        >
          Switch to {{ themeLabel() === 'Dark' ? 'Light' : 'Dark' }} mode
        </button>
        @if (error()) { <p class="gpa-error mt-3 text-sm" role="alert">{{ error() }}</p> }
        <button
          type="button"
          class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          (click)="signOut()"
        >
          Sign out
        </button>
      </div>
    </div>
  `,
})
export class ProfileComponent {
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  readonly profile = signal<Profile | null>(null);
  readonly error = signal('');
  readonly themeLabel = signal('Light');

  constructor() {
    this.refreshThemeLabel();
    this.profiles.getMyProfile().then((p) => this.profile.set(p)).catch(() => undefined);
  }

  toggleTheme(): void {
    this.theme.toggle();
    this.refreshThemeLabel();
  }

  private refreshThemeLabel(): void {
    this.themeLabel.set(this.theme.theme() === 'dark' ? 'Dark' : 'Light');
  }

  async signOut(): Promise<void> {
    this.error.set('');
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/auth', { replaceUrl: true });
    } catch {
      this.error.set('Sign-out failed. Please try again.');
    }
  }
}
