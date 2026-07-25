import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse } from '../models';

const TOKEN_KEY = 'steady_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));

  readonly isAuthenticated = computed(() => this.token() !== null);

  getToken(): string | null {
    return this.token();
  }

  store(res: AuthResponse): void {
    this.token.set(res.token);
    sessionStorage.setItem(TOKEN_KEY, res.token);
  }

  clear(): void {
    this.token.set(null);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
