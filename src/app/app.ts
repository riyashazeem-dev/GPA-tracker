import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="flex min-h-dvh flex-col">
      <div class="flex-1">
        <router-outlet />
      </div>
      <footer class="gpa-divider border-t px-4 py-4 text-center text-sm">
        <span class="gpa-muted">Built by </span>
        <a
          class="gpa-accent underline underline-offset-4"
          href="https://github.com/riyashazeem-dev"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="riyashazeem-dev on GitHub (opens in a new tab)"
        >riyashazeem-dev</a>
      </footer>
    </div>
  `,
})
export class App {}
