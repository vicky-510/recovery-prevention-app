import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';
import { AuthResponse, Category, Intervention, Role } from '../models';

/** Thin transport layer — the token is attached by `authInterceptor`. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  signup(email: string, password: string, role: Role): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/signup', { email, password, role })
      .pipe(tap((res) => this.auth.store(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.auth.store(res)));
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/interventions/categories');
  }

  createIntervention(categoryCode: string): Observable<Intervention> {
    return this.http.post<Intervention>('/api/interventions', { category_code: categoryCode });
  }
}
