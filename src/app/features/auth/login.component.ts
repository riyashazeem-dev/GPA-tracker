import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { isSupabaseConfigured } from '../../core/supabase/supabase.client';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <main class="gpa-auth mx-auto max-w-md px-4 py-16">
      <section class="gpa-panel p-6 sm:p-8">
        <h1 class="text-2xl font-bold">Sign in to GPA Tracker</h1>
        <p class="gpa-muted mt-2 text-sm">Choose your Google account to open your own programme and grades.</p>
        @if (!supabaseConfigured) { <p class="gpa-pending mt-4 text-sm">Connect Supabase to enable sign-in.</p> }
        <button type="button" class="gpa-button mt-6 w-full" [disabled]="loading() || !supabaseConfigured"
          (click)="signInWithGoogle()">{{ loading() ? 'Redirecting…' : 'Sign in with Google' }}</button>
        @if (error()) { <p class="gpa-error mt-4 text-sm" role="alert">{{ error() }}</p> }
      </section>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly supabaseConfigured = isSupabaseConfigured;

  async signInWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.signInWithGoogle();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not start Google sign-in. Please try again.');
      this.loading.set(false);
    }
  }
}
