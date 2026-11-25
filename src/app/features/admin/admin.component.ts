import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { supabase } from '../../core/supabase/supabase.client';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="text-2xl font-semibold">Admin</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Manage curriculum, grading, and AI configuration (admin only).
    </p>

    <div class="mt-6 max-w-xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 class="text-lg font-medium">AI model configuration</h2>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        The OpenRouter API key is a server-side secret and is never stored here.
      </p>

      <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Primary model
        <input class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          [ngModel]="model()" (ngModelChange)="model.set($event)" />
      </label>
      <label class="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Fallback model
        <input class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          [ngModel]="fallbackModel()" (ngModelChange)="fallbackModel.set($event)" />
      </label>

      @if (message()) { <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">{{ message() }}</p> }

      <button
        type="button"
        class="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        [disabled]="saving()"
        (click)="save()"
      >
        {{ saving() ? 'Saving…' : 'Save configuration' }}
      </button>
    </div>
  `,
})
export class AdminComponent {
  readonly model = signal('');
  readonly fallbackModel = signal('');
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const { data, error } = await supabase
      .from('ai_config')
      .select('model, fallback_model')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      this.message.set(error.message);
      return;
    }
    this.model.set(data?.model ?? '');
    this.fallbackModel.set(data?.fallback_model ?? '');
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.message.set(null);
    const { error } = await supabase
      .from('ai_config')
      .update({ model: this.model(), fallback_model: this.fallbackModel(), updated_at: new Date().toISOString() })
      .eq('id', 1);
    this.saving.set(false);
    this.message.set(error ? error.message : 'Configuration saved.');
  }
}