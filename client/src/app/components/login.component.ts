import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Role } from '../models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="flex min-h-screen items-center justify-center p-5">
      <div class="w-full max-w-md animate-fade-up">
        <header class="mb-8 text-center">
          <div
            class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-calm/20 bg-calm/10"
          >
            <span class="text-2xl" aria-hidden="true">🫧</span>
          </div>
          <h1 class="text-3xl font-semibold tracking-tight text-chalk">Steady</h1>
          <p class="mt-2 text-[15px] leading-relaxed text-mist">
            Support in the moments that matter most.
          </p>
        </header>

        <section
          class="rounded-2xl border border-line bg-surface/80 p-7 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <!-- Tabs rather than buttons, so they do not collide with the submit
               control that shares their wording. -->
          <div role="tablist" class="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-ink/60 p-1">
            @for (option of modes; track option.value) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode === option.value"
                (click)="setMode(option.value)"
                class="rounded-lg px-3 py-2 text-sm font-medium transition"
                [class]="
                  mode === option.value
                    ? 'bg-raised text-chalk shadow-sm'
                    : 'text-mist hover:text-chalk'
                "
              >
                {{ option.label }}
              </button>
            }
          </div>

          <form class="space-y-5" (ngSubmit)="submit()">
            <div>
              <label for="email" class="mb-2 block text-sm font-medium text-chalk">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                [(ngModel)]="email"
                class="w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-chalk placeholder:text-mist/50 transition focus:border-calm/50 focus:outline-none focus:ring-4 focus:ring-calm/10"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label for="password" class="mb-2 block text-sm font-medium text-chalk">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                [attr.autocomplete]="mode === 'login' ? 'current-password' : 'new-password'"
                required
                [(ngModel)]="password"
                class="w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-chalk placeholder:text-mist/50 transition focus:border-calm/50 focus:outline-none focus:ring-4 focus:ring-calm/10"
                [placeholder]="mode === 'signup' ? 'At least 8 characters' : '••••••••'"
              />
            </div>

            @if (mode === 'signup') {
              <fieldset>
                <legend class="mb-2 block text-sm font-medium text-chalk">I am</legend>
                <div class="grid gap-3 sm:grid-cols-2">
                  @for (option of roles; track option.value) {
                    <button
                      type="button"
                      (click)="role = option.value"
                      class="rounded-xl border p-4 text-left transition"
                      [class]="
                        role === option.value
                          ? 'border-calm/50 bg-calm/10'
                          : 'border-line bg-ink/40 hover:border-line/80 hover:bg-raised'
                      "
                    >
                      <span class="block text-xl" aria-hidden="true">{{ option.icon }}</span>
                      <span class="mt-2 block text-sm font-medium text-chalk">
                        {{ option.label }}
                      </span>
                      <span class="mt-0.5 block text-xs leading-relaxed text-mist">
                        {{ option.hint }}
                      </span>
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (error) {
              <p
                role="alert"
                class="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {{ error }}
              </p>
            }

            <button
              type="submit"
              [disabled]="busy"
              class="w-full rounded-xl bg-calm px-4 py-3.5 font-semibold text-ink transition hover:bg-calm-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account' }}
            </button>
          </form>
        </section>

        <p class="mt-6 text-center text-xs leading-relaxed text-mist/70">
          Steady offers grounding steps, not medical care.<br />
          In an emergency, contact your local emergency services.
        </p>
      </div>
    </main>
  `,
})
export class LoginComponent {
  private api = inject(ApiService);

  protected readonly modes = [
    { value: 'login' as const, label: 'Sign in' },
    { value: 'signup' as const, label: 'Create account' },
  ];

  protected readonly roles = [
    {
      value: 'person' as Role,
      icon: '🌱',
      label: 'In recovery',
      hint: 'Steps for me',
    },
    {
      value: 'caregiver' as Role,
      icon: '🤝',
      label: 'A caregiver',
      hint: 'Words for someone I love',
    },
  ];

  mode: 'login' | 'signup' = 'login';
  email = '';
  password = '';
  role: Role = 'person';
  busy = false;
  error = '';

  setMode(mode: 'login' | 'signup'): void {
    this.mode = mode;
    this.error = '';
  }

  submit(): void {
    if (!this.email || !this.password) {
      this.error = 'Email and password are required.';
      return;
    }

    this.busy = true;
    this.error = '';

    const request$ =
      this.mode === 'login'
        ? this.api.login(this.email, this.password)
        : this.api.signup(this.email, this.password, this.role);

    // On success AuthService sets the session signal, which swaps in the crisis view.
    request$.subscribe({
      next: () => {
        this.busy = false;
      },
      error: (err) => {
        this.busy = false;
        this.error = err.error?.error ?? 'Something went wrong. Please try again.';
      },
    });
  }
}
