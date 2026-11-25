import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { isSupabaseConfigured } from '../../supabase/supabase.client';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly supabaseConfigured = isSupabaseConfigured;
  readonly signingOut = signal(false);
  readonly error = signal('');

  async signOut(): Promise<void> {
    this.signingOut.set(true);
    this.error.set('');
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/auth', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Sign-out failed. Please try again.');
    } finally {
      this.signingOut.set(false);
    }
  }
}
