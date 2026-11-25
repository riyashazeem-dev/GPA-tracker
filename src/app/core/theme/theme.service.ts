import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Application theme with persistence. Applies `dark` class to <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = 'smart-gpa-theme';
  readonly theme = signal<Theme>(this.readInitial());

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(this.key, theme);
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }

  private readInitial(): Theme {
    const stored = localStorage.getItem(this.key);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}