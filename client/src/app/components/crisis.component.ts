import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../core/auth.service';
import { VoiceService } from '../core/voice.service';
import { matchCategory } from '../core/category-match';
import { Category, EducationNote, Profile, ProfileUpdate, Script } from '../models';

type View = 'categories' | 'generating' | 'script' | 'education' | 'contact';

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
  imports: [FormsModule],
  template: `
    <main class="min-h-screen p-6">
      <header class="mx-auto flex max-w-2xl items-center justify-between">
        <h1 class="text-lg font-semibold text-slate-900">Steady</h1>
        <div class="flex items-center gap-4">
          <button
            type="button"
            (click)="openContactSetup()"
            class="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            About you
          </button>
          <button
            type="button"
            (click)="signOut()"
            class="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <div class="mx-auto mt-8 max-w-2xl">
        @switch (view) {
          @case ('categories') {
            <h2 class="text-3xl font-semibold text-slate-900">What's happening?</h2>
            <p class="mt-2 text-slate-500">Tap once, or say it out loud.</p>

            @if (error) {
              <p role="alert" class="mt-4 text-sm text-red-600">{{ error }}</p>
            }

            @if (voice.canListen) {
              <button
                type="button"
                (click)="startListening()"
                [disabled]="voice.listening()"
                class="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-5 text-lg font-medium text-slate-700 hover:border-slate-400 disabled:opacity-70"
              >
                <span class="text-2xl" aria-hidden="true">{{ voice.listening() ? '🔴' : '🎙️' }}</span>
                {{ voice.listening() ? 'Listening — say what you need' : 'Or speak instead of tapping' }}
              </button>
            }

            <div class="mt-4 grid gap-4 sm:grid-cols-2">
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

            @if (profile?.safe_contact_phone) {
              <a
                [href]="'tel:' + profile!.safe_contact_phone"
                class="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 py-5 text-lg font-medium text-white hover:bg-emerald-800"
              >
                <span class="text-2xl" aria-hidden="true">📞</span>
                Call {{ profile!.safe_contact_name }} now
              </a>
            }
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
                <div class="flex items-start justify-between gap-4">
                  <p class="text-sm font-medium text-slate-400">
                    Step {{ stepIndex + 1 }} of {{ script.steps.length }}
                  </p>
                  @if (voice.canSpeak) {
                    <button
                      type="button"
                      (click)="readStepAloud()"
                      class="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      🔊 Read aloud
                    </button>
                  }
                </div>
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

              @if (profile?.safe_contact_phone) {
                <a
                  [href]="'tel:' + profile!.safe_contact_phone"
                  class="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 py-4 font-medium text-white hover:bg-emerald-800"
                >
                  <span aria-hidden="true">📞</span>
                  Call {{ profile!.safe_contact_name }}
                </a>
              }

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  (click)="openEducation()"
                  class="rounded-xl border border-slate-300 px-4 py-3 text-slate-600 hover:bg-white"
                >
                  Why is this happening?
                </button>
                <button
                  type="button"
                  (click)="reset()"
                  class="rounded-xl border border-slate-300 px-4 py-3 text-slate-600 hover:bg-white"
                >
                  Back to start
                </button>
              </div>
            }
          }

          @case ('education') {
            @if (loadingEducation) {
              <div class="flex min-h-72 flex-col items-center justify-center text-center">
                <div
                  class="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700"
                  role="status"
                  aria-label="Loading"
                ></div>
              </div>
            } @else if (education) {
              <h2 class="text-3xl font-semibold text-slate-900">{{ education.title }}</h2>

              <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p class="text-lg leading-relaxed text-slate-700">
                  {{ education.why_it_happens }}
                </p>

                <h3 class="mt-6 text-sm font-medium uppercase tracking-wide text-slate-400">
                  What helps
                </h3>
                <ul class="mt-3 space-y-2">
                  @for (item of education.what_helps; track item) {
                    <li class="flex gap-3 text-slate-700">
                      <span class="text-slate-400" aria-hidden="true">•</span>
                      <span>{{ item }}</span>
                    </li>
                  }
                </ul>

                <p class="mt-6 rounded-xl bg-slate-100 p-4 text-slate-700">
                  {{ education.how_long }}
                </p>
              </section>

              <button
                type="button"
                (click)="backFromEducation()"
                class="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-600 hover:bg-white"
              >
                Back
              </button>
            } @else if (error) {
              <p role="alert" class="text-sm text-red-600">{{ error }}</p>
              <button
                type="button"
                (click)="backFromEducation()"
                class="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-600 hover:bg-white"
              >
                Back
              </button>
            }
          }

          @case ('contact') {
            <h2 class="text-3xl font-semibold text-slate-900">About you</h2>
            <p class="mt-2 text-slate-500">
              Set this while things are calm. Everything here is optional, and it makes the
              steps you get sound like they were written for you.
            </p>

            <form class="mt-6 space-y-4" (ngSubmit)="saveProfile()">
              <div>
                <label for="firstName" class="block text-sm font-medium text-slate-700">
                  Your first name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  [(ngModel)]="form.first_name"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              @if (profile?.role === 'person') {
                <div>
                  <label for="sobrietyDate" class="block text-sm font-medium text-slate-700">
                    Sober since
                  </label>
                  <input
                    id="sobrietyDate"
                    name="sobrietyDate"
                    type="date"
                    [(ngModel)]="form.sobriety_start_date"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  @if (profile?.days_sober !== null && profile?.days_sober !== undefined) {
                    <p class="mt-1 text-sm text-emerald-700">
                      {{ profile!.days_sober }} days so far.
                    </p>
                  }
                </div>
              }

              <fieldset class="rounded-xl border border-slate-200 p-4">
                <legend class="px-1 text-sm font-medium text-slate-700">
                  Someone you trust
                </legend>
                <p class="text-sm text-slate-500">
                  Reachable in one tap when things are hard, and named in your steps.
                </p>

                <label for="contactName" class="mt-3 block text-sm font-medium text-slate-700">
                  Their name
                </label>
                <input
                  id="contactName"
                  name="contactName"
                  [(ngModel)]="form.safe_contact_name"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />

                <label for="contactPhone" class="mt-3 block text-sm font-medium text-slate-700">
                  Their phone number
                </label>
                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  [(ngModel)]="form.safe_contact_phone"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </fieldset>

              @if (error) {
                <p role="alert" class="text-sm text-red-600">{{ error }}</p>
              }

              <button
                type="submit"
                [disabled]="savingProfile"
                class="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {{ savingProfile ? 'Saving…' : 'Save' }}
              </button>
            </form>

            <button
              type="button"
              (click)="reset()"
              class="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-600 hover:bg-white"
            >
              Back
            </button>
          }
        }
      </div>
    </main>
  `,
})
export class CrisisComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  protected voice = inject(VoiceService);

  view: View = 'categories';
  categories: Category[] = [];
  profile: Profile | null = null;

  script: Script | null = null;
  activeCategory: string | null = null;
  activeLabel = '';
  stepIndex = 0;

  education: EducationNote | null = null;
  loadingEducation = false;

  form: ProfileUpdate = {
    first_name: '',
    sobriety_start_date: '',
    safe_contact_name: '',
    safe_contact_phone: '',
  };
  savingProfile = false;

  error = '';

  ngOnInit(): void {
    this.api.categories().subscribe({
      next: (categories) => (this.categories = categories),
      error: () => (this.error = 'Could not load options. Please refresh.'),
    });

    this.api.profile().subscribe({
      next: (profile) => this.applyProfile(profile),
      // A missing profile only costs personalisation, so fail quietly.
      error: () => undefined,
    });
  }

  icon(code: string): string {
    return CATEGORY_ICONS[code] ?? '•';
  }

  startListening(): void {
    this.error = '';

    this.voice
      .listen()
      .then((heard) => {
        const code = matchCategory(heard, this.categories);
        const category = this.categories.find((c) => c.code === code);

        if (category) {
          this.trigger(category);
        } else {
          this.error = "I didn't catch that. Try again, or tap one below.";
        }
      })
      .catch(() => {
        this.error = "I couldn't hear anything. Tap one below instead.";
      });
  }

  trigger(category: Category): void {
    this.voice.stopListening();
    this.view = 'generating';
    this.activeCategory = category.code;
    this.activeLabel = category.label;
    this.education = null;
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

  readStepAloud(): void {
    if (this.script) this.voice.speak(this.script.steps[this.stepIndex]);
  }

  nextStep(): void {
    if (this.script && this.stepIndex < this.script.steps.length - 1) {
      this.voice.stopSpeaking();
      this.stepIndex += 1;
    }
  }

  openEducation(): void {
    if (!this.activeCategory) return;

    this.voice.stopSpeaking();
    this.view = 'education';
    this.error = '';

    if (this.education) return;

    this.loadingEducation = true;
    this.api.education(this.activeCategory).subscribe({
      next: (note) => {
        this.education = note;
        this.loadingEducation = false;
      },
      error: () => {
        this.loadingEducation = false;
        this.error = 'Could not load this right now.';
      },
    });
  }

  backFromEducation(): void {
    this.error = '';
    this.view = this.script ? 'script' : 'categories';
  }

  openContactSetup(): void {
    this.voice.stopSpeaking();
    this.error = '';
    this.view = 'contact';
  }

  private applyProfile(profile: Profile): void {
    this.profile = profile;
    this.form = {
      first_name: profile.first_name ?? '',
      sobriety_start_date: profile.sobriety_start_date?.slice(0, 10) ?? '',
      safe_contact_name: profile.safe_contact_name ?? '',
      safe_contact_phone: profile.safe_contact_phone ?? '',
    };
  }

  saveProfile(): void {
    this.savingProfile = true;
    this.error = '';

    this.api.saveProfile(this.form).subscribe({
      next: (profile) => {
        this.applyProfile(profile);
        this.savingProfile = false;
        this.view = 'categories';
      },
      error: (err) => {
        this.savingProfile = false;
        this.error = err.error?.error ?? 'Could not save that.';
      },
    });
  }

  reset(): void {
    this.voice.stopSpeaking();
    this.script = null;
    this.activeCategory = null;
    this.education = null;
    this.stepIndex = 0;
    this.error = '';
    this.view = 'categories';
  }

  signOut(): void {
    this.voice.stopSpeaking();
    this.auth.clear();
  }
}
