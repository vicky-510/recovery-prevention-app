import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import {
  AuthResponse,
  Category,
  EducationNote,
  Intervention,
  Profile,
  ProfileUpdate,
  Role,
} from '../models';

// Empty in development, where the dev server proxies /api to the local backend.
const api = environment.apiBase;

/** Thin transport layer — the token is attached by `authInterceptor`. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  signup(email: string, password: string, role: Role): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${api}/api/auth/signup`, { email, password, role })
      .pipe(tap((res) => this.auth.store(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${api}/api/auth/login`, { email, password })
      .pipe(tap((res) => this.auth.store(res)));
  }

  profile(): Observable<Profile> {
    return this.http.get<Profile>(`${api}/api/me`);
  }

  saveProfile(update: ProfileUpdate): Observable<Profile> {
    return this.http.put<Profile>(`${api}/api/me`, update);
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${api}/api/interventions/categories`);
  }

  createIntervention(categoryCode: string): Observable<Intervention> {
    return this.http.post<Intervention>(`${api}/api/interventions`, {
      category_code: categoryCode,
      local_hour: new Date().getHours(),
    });
  }

  /** Sends the recording itself; Gemini decides what the moment is. */
  createInterventionFromVoice(audioBase64: string, mimeType: string): Observable<Intervention> {
    return this.http.post<Intervention>(`${api}/api/interventions/voice`, {
      audio_base64: audioBase64,
      mime_type: mimeType,
      local_hour: new Date().getHours(),
    });
  }

  education(categoryCode: string): Observable<EducationNote> {
    return this.http.get<EducationNote>(`${api}/api/education/${categoryCode}`);
  }
}
