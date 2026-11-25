import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-slate-900">{{ title }}</h1>
      @if (subtitle) {
        <p class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
      }
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
}