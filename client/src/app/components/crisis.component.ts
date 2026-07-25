import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../core/auth.service';
import { Recording, VoiceService } from '../core/voice.service';
import { Category, EducationNote, Profile, ProfileUpdate, Script } from '../models';

type View = 'categories' | 'generating' | 'script' | 'education' | 'contact';

/** Presentational detail keyed by the category codes seeded in the database. */
const CATEGORY_STYLE: Record<string, { icon: string; tint: string }> = {
  craving: { icon: '🌊', tint: 'group-hover:border-sky-400/40 group-hover:bg-sky-400/[0.06]' },
  panic: { icon: '💨', tint: 'group-hover:border-violet-400/40 group-hover:bg-violet-400/[0.06]' },
  post_relapse: {
    icon: '🌱',
    tint: 'group-hover:border-emerald-400/40 group-hover:bg-emerald-400/[0.06]',
  },
  caregiver_checkin: {
    icon: '🤝',
    tint: 'group-hover:border-amber-400/40 group-hover:bg-amber-400/[0.06]',
  },
};

@Component({
  selector: 'app-crisis',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-lg focus:bg-calm focus:px-4 focus:py-2 focus:font-medium focus:text-ink"
      >
        Skip to content
      </a>

      <header class="sticky top-0 z-10 border-b border-line/60 bg-ink/80 backdrop-blur-xl">
        <div class="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <button
            type="button"
            (click)="reset()"
            class="flex items-center gap-2.5 text-left transition hover:opacity-80"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-xl border border-calm/20 bg-calm/10 text-sm"
              aria-hidden="true"
              >🫧</span
            >
            <span class="font-semibold tracking-tight text-chalk">Steady</span>
          </button>

          <nav class="flex items-center gap-1">
            <button
              type="button"
              (click)="openProfile()"
              class="rounded-lg px-3 py-1.5 text-sm text-mist transition hover:bg-raised hover:text-chalk"
            >
              About you
            </button>
            <button
              type="button"
              (click)="signOut()"
              class="rounded-lg px-3 py-1.5 text-sm text-mist transition hover:bg-raised hover:text-chalk"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main id="main" class="mx-auto max-w-3xl px-5 pb-16 pt-10">
        @switch (view) {
          @case ('categories') {
            <div class="animate-fade-up">
              <h1 class="text-4xl font-semibold tracking-tight text-chalk sm:text-5xl">
                What's happening?
              </h1>
              <p class="mt-3 text-lg text-mist">
                @if (profile?.first_name) {
                  {{ profile!.first_name }} — tap once, or just say it.
                } @else {
                  Tap once, or just say it. No typing needed.
                }
              </p>

              @if (profile?.days_sober !== null && profile?.days_sober !== undefined) {
                <p class="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 text-sm text-emerald-300">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  {{ profile!.days_sober }} days
                </p>
              }

              @if (error) {
                <p
                  role="alert"
                  class="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
                >
                  {{ error }}
                </p>
              }

              @if (voice.canRecord) {
                <button
                  type="button"
                  (click)="voice.recording() ? finishRecording() : startRecording()"
                  class="group relative mt-8 flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-5 text-left transition"
                  [class]="
                    voice.recording()
                      ? 'border-rose-400/40 bg-rose-500/[0.08]'
                      : 'border-line bg-surface/70 hover:border-calm/40 hover:bg-calm/[0.05]'
                  "
                >
                  <span class="relative flex h-12 w-12 shrink-0 items-center justify-center">
                    @if (voice.recording()) {
                      <span
                        class="absolute inset-0 animate-pulse-ring rounded-full bg-rose-400/40"
                      ></span>
                      <span
                        class="relative flex h-12 w-12 animate-breathe items-center justify-center rounded-full bg-rose-500/20 text-xl"
                        >⏹</span
                      >
                    } @else {
                      <span
                        class="flex h-12 w-12 items-center justify-center rounded-full bg-raised text-xl transition group-hover:bg-calm/15"
                        >🎙</span
                      >
                    }
                  </span>

                  <span class="min-w-0">
                    <span class="block font-medium text-chalk">
                      {{ voice.recording() ? "I'm listening — tap when you're done" : 'Speak instead' }}
                    </span>
                    <span class="mt-0.5 block text-sm text-mist">
                      {{
                        voice.recording()
                          ? 'Say whatever comes out. It does not have to make sense.'
                          : "You don't need to pick anything. Just talk."
                      }}
                    </span>
                  </span>
                </button>
              }

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                @for (category of categories; track category.code) {
                  <button
                    type="button"
                    (click)="trigger(category)"
                    class="group flex min-h-[9.5rem] flex-col justify-between rounded-2xl border border-line bg-surface/70 p-5 text-left transition duration-200 hover:-translate-y-0.5"
                    [class]="tint(category.code)"
                  >
                    <span
                      class="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/60 text-xl"
                      aria-hidden="true"
                      >{{ icon(category.code) }}</span
                    >
                    <span class="mt-4 text-[17px] font-medium leading-snug text-chalk">
                      {{ category.label }}
                    </span>
                  </button>
                }
              </div>

              @if (profile?.safe_contact_phone) {
                <a
                  [href]="'tel:' + profile!.safe_contact_phone"
                  class="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-6 py-4 font-medium text-emerald-300 transition hover:bg-emerald-500/15"
                >
                  <span class="text-lg" aria-hidden="true">📞</span>
                  Call {{ profile!.safe_contact_name }}
                </a>
              }
            </div>
          }

          @case ('generating') {
            <div class="flex min-h-[24rem] flex-col items-center justify-center text-center">
              <div class="relative flex h-20 w-20 items-center justify-center">
                <span class="absolute inset-0 animate-pulse-ring rounded-full bg-calm/30"></span>
                <span
                  class="relative h-16 w-16 animate-breathe rounded-full border border-calm/30 bg-calm/10"
                ></span>
              </div>
              <p class="mt-8 text-lg text-chalk">Putting something together for you</p>
              <p class="mt-1.5 text-sm text-mist">A few seconds. Breathe until then.</p>
            </div>
          }

          @case ('script') {
            @if (script) {
              <div class="animate-fade-up">
                @if (activeLabel) {
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-calm">
                    {{ activeLabel }}
                  </p>
                }
                <h1 class="mt-2 text-3xl font-semibold leading-tight tracking-tight text-chalk">
                  {{ script.headline }}
                </h1>

                <div class="mt-8 flex items-center gap-3">
                  @for (dot of script.steps; track $index) {
                    <span
                      class="h-1 flex-1 rounded-full transition-colors duration-300"
                      [class]="$index <= stepIndex ? 'bg-calm' : 'bg-line'"
                    ></span>
                  }
                </div>

                <section
                  class="mt-5 rounded-2xl border border-line bg-surface/80 p-7 shadow-2xl shadow-black/30"
                  aria-live="polite"
                >
                  <div class="flex items-start justify-between gap-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-mist">
                      Step {{ stepIndex + 1 }} of {{ script.steps.length }}
                    </p>
                    @if (voice.canSpeak) {
                      <button
                        type="button"
                        (click)="readStepAloud()"
                        class="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-mist transition hover:border-calm/40 hover:text-calm"
                      >
                        🔊 Read aloud
                      </button>
                    }
                  </div>
                  <p class="mt-4 text-2xl leading-relaxed text-chalk">
                    {{ script.steps[stepIndex] }}
                  </p>
                </section>

                @if (stepIndex < script.steps.length - 1) {
                  <button
                    type="button"
                    (click)="nextStep()"
                    class="mt-4 w-full rounded-2xl bg-calm px-6 py-5 text-lg font-semibold text-ink transition hover:bg-calm-dim"
                  >
                    Done — what's next
                  </button>
                } @else {
                  <section
                    class="mt-4 overflow-hidden rounded-2xl border border-calm/25 bg-calm/[0.07] p-7 text-center"
                  >
                    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-calm">
                      Say this out loud
                    </p>
                    <p class="mt-3 text-2xl leading-relaxed text-chalk">
                      {{ script.grounding_line }}
                    </p>
                    @if (voice.canSpeak) {
                      <button
                        type="button"
                        (click)="voice.speak(script.grounding_line)"
                        class="mt-5 rounded-lg border border-calm/30 px-3 py-1.5 text-xs text-calm transition hover:bg-calm/10"
                      >
                        🔊 Hear it first
                      </button>
                    }
                  </section>
                }

                @if (profile?.safe_contact_phone) {
                  <a
                    [href]="'tel:' + profile!.safe_contact_phone"
                    class="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-6 py-4 font-medium text-emerald-300 transition hover:bg-emerald-500/15"
                  >
                    <span class="text-lg" aria-hidden="true">📞</span>
                    Call {{ profile!.safe_contact_name }}
                  </a>
                }

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    (click)="openEducation()"
                    class="rounded-xl border border-line bg-surface/50 px-4 py-3.5 text-sm text-mist transition hover:border-line/80 hover:text-chalk"
                  >
                    Why is this happening?
                  </button>
                  <button
                    type="button"
                    (click)="reset()"
                    class="rounded-xl border border-line bg-surface/50 px-4 py-3.5 text-sm text-mist transition hover:border-line/80 hover:text-chalk"
                  >
                    Back to start
                  </button>
                </div>
              </div>
            }
          }

          @case ('education') {
            @if (loadingEducation) {
              <div class="flex min-h-[24rem] items-center justify-center">
                <span
                  class="h-14 w-14 animate-breathe rounded-full border border-calm/30 bg-calm/10"
                  role="status"
                  aria-label="Loading"
                ></span>
              </div>
            } @else if (education) {
              <article class="animate-fade-up">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-calm">
                  Understanding this
                </p>
                <h1 class="mt-2 text-3xl font-semibold leading-tight tracking-tight text-chalk">
                  {{ education.title }}
                </h1>

                <p class="mt-6 text-lg leading-relaxed text-mist">
                  {{ education.why_it_happens }}
                </p>

                <section class="mt-8 rounded-2xl border border-line bg-surface/70 p-7">
                  <h2 class="text-xs font-semibold uppercase tracking-[0.14em] text-mist">
                    What helps
                  </h2>
                  <ul class="mt-5 space-y-4">
                    @for (item of education.what_helps; track item) {
                      <li class="flex gap-4">
                        <span
                          class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-calm"
                          aria-hidden="true"
                        ></span>
                        <span class="leading-relaxed text-chalk">{{ item }}</span>
                      </li>
                    }
                  </ul>
                </section>

                <p
                  class="mt-4 rounded-2xl border border-calm/20 bg-calm/[0.06] p-6 leading-relaxed text-chalk"
                >
                  {{ education.how_long }}
                </p>

                <button
                  type="button"
                  (click)="backFromEducation()"
                  class="mt-6 w-full rounded-xl border border-line bg-surface/50 px-4 py-3.5 text-sm text-mist transition hover:border-line/80 hover:text-chalk"
                >
                  Back
                </button>
              </article>
            } @else if (error) {
              <div class="animate-fade-up">
                <p
                  role="alert"
                  class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
                >
                  {{ error }}
                </p>
                <button
                  type="button"
                  (click)="backFromEducation()"
                  class="mt-4 w-full rounded-xl border border-line bg-surface/50 px-4 py-3.5 text-sm text-mist transition hover:text-chalk"
                >
                  Back
                </button>
              </div>
            }
          }

          @case ('contact') {
            <div class="animate-fade-up">
              <h1 class="text-3xl font-semibold tracking-tight text-chalk">About you</h1>
              <p class="mt-3 leading-relaxed text-mist">
                All optional, and best done now while things are calm. What you put here makes
                your steps sound like they were written for you, rather than for anyone.
              </p>

              <form class="mt-8 space-y-5" (ngSubmit)="saveProfile()">
                <div class="rounded-2xl border border-line bg-surface/70 p-6">
                  <label for="firstName" class="mb-2 block text-sm font-medium text-chalk">
                    Your first name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    [(ngModel)]="form.first_name"
                    placeholder="What should we call you?"
                    class="w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-chalk placeholder:text-mist/50 transition focus:border-calm/50 focus:outline-none focus:ring-4 focus:ring-calm/10"
                  />

                  @if (profile?.role === 'person') {
                    <label for="sobrietyDate" class="mb-2 mt-5 block text-sm font-medium text-chalk">
                      Sober since
                    </label>
                    <input
                      id="sobrietyDate"
                      name="sobrietyDate"
                      type="date"
                      [(ngModel)]="form.sobriety_start_date"
                      class="w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-chalk transition [color-scheme:dark] focus:border-calm/50 focus:outline-none focus:ring-4 focus:ring-calm/10"
                    />
                    @if (profile?.days_sober !== null && profile?.days_sober !== undefined) {
                      <p class="mt-2 text-sm text-emerald-300">
                        {{ profile!.days_sober }} days so far. That counts.
                      </p>
                    }
                  }
                </div>

                <div class="rounded-2xl border border-line bg-surface/70 p-6">
                  <h2 class="text-sm font-medium text-chalk">Someone you trust</h2>
                  <p class="mt-1 text-sm leading-relaxed text-mist">
                    One tap away when things are hard, and named by name in your steps.
                  </p>

                  <label for="contactName" class="mb-2 mt-5 block text-sm font-medium text-chalk">
                    Their name
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    [(ngModel)]="form.safe_contact_name"
                    class="w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-chalk placeholder:text-mist/50 transition focus:border-calm/50 focus:outline-none focus:ring-4 focus:ring-calm/10"
                  />

                  <label for="contactPhone" class="mb-2 mt-5 block text-sm font-medium text-chalk">
                    Their phone number
                  </label>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    [(ngModel)]="form.safe_contact_phone"
                    class="w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-chalk placeholder:text-mist/50 transition focus:border-calm/50 focus:outline-none focus:ring-4 focus:ring-calm/10"
                  />
                </div>

                @if (error) {
                  <p
                    role="alert"
                    class="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    {{ error }}
                  </p>
                }

                <div class="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    [disabled]="savingProfile"
                    class="rounded-xl bg-calm px-4 py-3.5 font-semibold text-ink transition hover:bg-calm-dim disabled:opacity-50 sm:order-2"
                  >
                    {{ savingProfile ? 'Saving…' : 'Save' }}
                  </button>
                  <button
                    type="button"
                    (click)="reset()"
                    class="rounded-xl border border-line bg-surface/50 px-4 py-3.5 text-sm text-mist transition hover:text-chalk sm:order-1"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          }
        }
      </main>
    </div>
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
    return CATEGORY_STYLE[code]?.icon ?? '•';
  }

  tint(code: string): string {
    return CATEGORY_STYLE[code]?.tint ?? 'group-hover:border-calm/40';
  }

  startRecording(): void {
    this.error = '';

    this.voice
      .record()
      .then((recording) => this.sendRecording(recording))
      .catch(() => {
        this.error = 'I could not reach the microphone. Tap one below instead.';
      });
  }

  finishRecording(): void {
    this.voice.stopRecording();
  }

  private sendRecording({ base64, mimeType }: Recording): void {
    this.view = 'generating';
    this.education = null;

    this.api.createInterventionFromVoice(base64, mimeType).subscribe({
      next: (intervention) => {
        this.script = intervention.script_json;
        this.activeCategory = intervention.category_code ?? null;
        this.activeLabel =
          this.categories.find((c) => c.code === intervention.category_code)?.label ?? '';
        this.stepIndex = 0;
        this.view = 'script';
      },
      error: (err) => {
        this.view = 'categories';
        this.error =
          err.status === 422
            ? "I couldn't quite make that out. Try again, or tap one below."
            : (err.error?.error ?? 'Could not prepare your steps right now. Please try again.');
      },
    });
  }

  trigger(category: Category): void {
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
      error: (err) => {
        this.view = 'categories';
        this.error = err.error?.error ?? 'Could not prepare your steps right now. Please try again.';
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

  openProfile(): void {
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
