import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';
import {
  AuthResponse,
  Category,
  EducationNote,
  Intervention,
  Profile,
  Role,
} from '../models';

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

  profile(): Observable<Profile> {
    return this.http.get<Profile>('/api/me');
  }

  saveSafeContact(name: string, phone: string): Observable<Profile> {
    return this.http.put<Profile>('/api/me/safe-contact', { name, phone });
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/interventions/categories');
  }

  createIntervention(categoryCode: string): Observable<Intervention> {
    return this.http.post<Intervention>('/api/interventions', {
      category_code: categoryCode,
      local_hour: new Date().getHours(),
    });
  }

  education(categoryCode: string): Observable<EducationNote> {
    return this.http.get<EducationNote>(`/api/education/${categoryCode}`);
  }
}
