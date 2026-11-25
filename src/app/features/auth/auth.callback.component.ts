import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';

/**
 * OAuth redirect target. Supabase parses the session on load
 * (detectSessionInUrl); this component routes to onboarding or dashboard.
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="gpa-auth mx-auto max-w-md px-4 py-16">
      <section class="gpa-panel p-6">
        @if (failed()) {
          <p role="alert" class="gpa-error">Could not complete Google sign-in. Try choosing your account again.</p>
          <a routerLink="/auth" class="gpa-nav-link mt-4">Back to sign-in</a>
        } @else {
          <p role="status" class="gpa-muted">Completing sign-in…</p>
        }
      </section>
    </main>
  `,
})
export class AuthCallbackComponent {
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  readonly failed = signal(false);

  constructor() {
    void this.resolve();
  }

  private async resolve(): Promise<void> {
    try {
      const profile = await this.profiles.getMyProfile();
      if (!profile) {
        this.failed.set(true);
        return;
      }
      const destination = this.profiles.needsOnboarding(profile) ? '/onboarding' : '/dashboard';
      await this.router.navigateByUrl(destination, { replaceUrl: true });
    } catch {
      this.failed.set(true);
    }
  }
}
