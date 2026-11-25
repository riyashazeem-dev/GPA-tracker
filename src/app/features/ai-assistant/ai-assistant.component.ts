import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAssistantService, ChatTurn } from '../../services/ai-assistant.service';

interface Message extends ChatTurn {
  id: number;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">AI Academic Assistant</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Informational guidance only — not official academic advice. GPA/FGPA values
          come from the verified calculation engine.
        </p>
      </div>
      @if (messages().length > 0) {
        <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700" (click)="clear()">Clear</button>
      }
    </div>

    <div class="mt-4 grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 flex h-[32rem] flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          @if (messages().length === 0) {
            <p class="text-sm text-slate-500 dark:text-slate-400">Ask a question to get started.</p>
          }
          @for (m of messages(); track m.id) {
            <div class="flex" [class.justify-end]="m.role === 'user'">
              <div
                class="max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                [class]="m.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'"
              >
                {{ m.content }}
              </div>
            </div>
          }
          @if (loading()) {
            <div class="flex items-center gap-2 text-sm text-slate-400">
              <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
              <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]"></span>
              <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]"></span>
            </div>
          }
        </div>

        @if (error()) {
          <p class="px-4 pb-2 text-sm text-red-600">{{ error() }}</p>
        }

        <form class="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800" (submit)="send($event)">
          <input
            class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="Ask about your academic performance…"
            [ngModel]="input()"
            (ngModelChange)="input.set($event)"
            name="message"
          />
          <button
            type="submit"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            [disabled]="loading() || !input().trim()"
          >
            Send
          </button>
        </form>
      </div>

      <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 class="text-sm font-medium">Suggested questions</h2>
        <div class="mt-3 space-y-2">
          @for (q of suggestions; track q) {
            <button
              type="button"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              (click)="ask(q)"
            >
              {{ q }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class AiAssistantComponent {
  private readonly ai = inject(AiAssistantService);

  readonly messages = signal<Message[]>([]);
  readonly input = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly suggestions = [
    'How is my academic performance?',
    'How can I improve my FGPA?',
    'Can I achieve First Class?',
    'What grades do I need in my next semester?',
    'What happens if I get B+ in all remaining modules?',
    'Which remaining modules affect my target most?',
  ];

  private nextId = 1;

  clear(): void {
    this.messages.set([]);
    this.error.set(null);
  }

  async send(event: Event): Promise<void> {
    event.preventDefault();
    const question = this.input().trim();
    if (!question || this.loading()) return;
    this.input.set('');
    await this.ask(question);
  }

  async ask(question: string): Promise<void> {
    if (this.loading()) return;
    this.error.set(null);
    const history = this.messages().map((m) => ({ role: m.role, content: m.content }));
    this.messages.update((list) => [...list, { id: this.nextId++, role: 'user', content: question }]);
    this.loading.set(true);
    try {
      const { reply } = await this.ai.ask(question, history);
      this.messages.update((list) => [...list, { id: this.nextId++, role: 'assistant', content: reply }]);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}