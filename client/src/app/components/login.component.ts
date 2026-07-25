import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Role } from '../models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-6">
      <section class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 class="text-2xl font-semibold text-slate-900">Steady</h1>
        <p class="mt-1 text-sm text-slate-500">
          Support in the moments that matter most.
        </p>

        <form class="mt-6 space-y-4" (ngSubmit)="submit()">
          <div>
            <label for="email" class="block text-sm font-medium text-slate-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              [(ngModel)]="email"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              [attr.autocomplete]="mode === 'login' ? 'current-password' : 'new-password'"
              required
              [(ngModel)]="password"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          @if (mode === 'signup') {
            <div>
              <label for="role" class="block text-sm font-medium text-slate-700">I am a</label>
              <select
                id="role"
                name="role"
                [(ngModel)]="role"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="person">Person in recovery</option>
                <option value="caregiver">Caregiver</option>
              </select>
            </div>
          }

          @if (error) {
            <p role="alert" class="text-sm text-red-600">{{ error }}</p>
          }

          <button
            type="submit"
            [disabled]="busy"
            class="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {{ busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account' }}
          </button>
        </form>

        <button
          type="button"
          (click)="toggleMode()"
          class="mt-4 w-full text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          {{ mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in' }}
        </button>
      </section>
    </main>
  `,
})
export class LoginComponent {
  private api = inject(ApiService);

  mode: 'login' | 'signup' = 'login';
  email = '';
  password = '';
  role: Role = 'person';
  busy = false;
  error = '';

  toggleMode(): void {
    this.mode = this.mode === 'login' ? 'signup' : 'login';
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
