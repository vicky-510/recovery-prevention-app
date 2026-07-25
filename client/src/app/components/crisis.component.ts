import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../core/auth.service';
import { Category, Script } from '../models';

type View = 'categories' | 'generating' | 'script';

/** Presentational icons keyed by the category codes seeded in the database. */
const CATEGORY_ICONS: Record<string, string> = {
  craving: '🌊',
  panic: '💨',
  post_relapse: '🌱',
  caregiver_checkin: '🤝',
};

@Component({
  selector: 'app-crisis',
  standalone: true,
  template: `
    <main class="min-h-screen p-6">
      <header class="mx-auto flex max-w-2xl items-center justify-between">
        <h1 class="text-lg font-semibold text-slate-900">Steady</h1>
        <button
          type="button"
          (click)="signOut()"
          class="text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          Sign out
        </button>
      </header>

      <div class="mx-auto mt-8 max-w-2xl">
        @switch (view) {
          @case ('categories') {
            <h2 class="text-3xl font-semibold text-slate-900">What's happening?</h2>
            <p class="mt-2 text-slate-500">One tap. No typing needed.</p>

            @if (error) {
              <p role="alert" class="mt-4 text-sm text-red-600">{{ error }}</p>
            }

            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              @for (category of categories; track category.code) {
                <button
                  type="button"
                  (click)="trigger(category)"
                  class="flex min-h-36 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-slate-400 hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <span class="text-3xl" aria-hidden="true">{{ icon(category.code) }}</span>
                  <span class="mt-3 text-lg font-medium text-slate-900">{{ category.label }}</span>
                </button>
              }
            </div>
          }

          @case ('generating') {
            <div class="flex min-h-72 flex-col items-center justify-center text-center">
              <div
                class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700"
                role="status"
                aria-label="Preparing your steps"
              ></div>
              <p class="mt-6 text-lg text-slate-600">Preparing your steps…</p>
            </div>
          }

          @case ('script') {
            @if (script) {
              <p class="text-sm font-medium uppercase tracking-wide text-slate-400">
                {{ activeLabel }}
              </p>
              <h2 class="mt-1 text-3xl font-semibold text-slate-900">{{ script.headline }}</h2>

              <section
                class="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                aria-live="polite"
              >
                <p class="text-sm font-medium text-slate-400">
                  Step {{ stepIndex + 1 }} of {{ script.steps.length }}
                </p>
                <p class="mt-3 text-2xl leading-relaxed text-slate-900">
                  {{ script.steps[stepIndex] }}
                </p>
              </section>

              @if (stepIndex < script.steps.length - 1) {
                <button
                  type="button"
                  (click)="nextStep()"
                  class="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-6 text-xl font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  I've done this — next
                </button>
              } @else {
                <section class="mt-6 rounded-2xl bg-slate-900 p-8 text-center">
                  <p class="text-sm font-medium uppercase tracking-wide text-slate-400">
                    Say this out loud
                  </p>
                  <p class="mt-3 text-2xl leading-relaxed text-white">
                    {{ script.grounding_line }}
                  </p>
                </section>
              }

              <button
                type="button"
                (click)="reset()"
                class="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-600 hover:bg-white"
              >
                Back to start
              </button>
            }
          }
        }
      </div>
    </main>
  `,
})
export class CrisisComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  view: View = 'categories';
  categories: Category[] = [];
  script: Script | null = null;
  activeLabel = '';
  stepIndex = 0;
  error = '';

  ngOnInit(): void {
    this.api.categories().subscribe({
      next: (categories) => (this.categories = categories),
      error: () => (this.error = 'Could not load options. Please refresh.'),
    });
  }

  icon(code: string): string {
    return CATEGORY_ICONS[code] ?? '•';
  }

  trigger(category: Category): void {
    this.view = 'generating';
    this.activeLabel = category.label;
    this.error = '';

    this.api.createIntervention(category.code).subscribe({
      next: (intervention) => {
        this.script = intervention.script_json;
        this.stepIndex = 0;
        this.view = 'script';
      },
      error: () => {
        this.view = 'categories';
        this.error = 'Could not prepare your steps right now. Please try again.';
      },
    });
  }

  nextStep(): void {
    if (this.script && this.stepIndex < this.script.steps.length - 1) {
      this.stepIndex += 1;
    }
  }

  reset(): void {
    this.script = null;
    this.stepIndex = 0;
    this.view = 'categories';
  }

  signOut(): void {
    this.auth.clear();
  }
}
