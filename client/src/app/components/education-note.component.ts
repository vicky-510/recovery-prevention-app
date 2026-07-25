import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EducationNote } from '../models';

/** Read in a calmer moment than the script, so it is allowed to be prose. */
@Component({
  selector: 'app-education-note',
  standalone: true,
  template: `
    <article class="animate-fade-up">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-calm">Understanding this</p>
      <h1 class="mt-2 text-3xl font-semibold leading-tight tracking-tight text-chalk">
        {{ note.title }}
      </h1>

      <p class="mt-6 text-lg leading-relaxed text-mist">{{ note.why_it_happens }}</p>

      <section class="mt-8 rounded-2xl border border-line bg-surface/70 p-7">
        <h2 class="text-xs font-semibold uppercase tracking-[0.14em] text-mist">What helps</h2>
        <ul class="mt-5 space-y-4">
          @for (item of note.what_helps; track item) {
            <li class="flex gap-4">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-calm" aria-hidden="true"></span>
              <span class="leading-relaxed text-chalk">{{ item }}</span>
            </li>
          }
        </ul>
      </section>

      <p class="mt-4 rounded-2xl border border-calm/20 bg-calm/[0.06] p-6 leading-relaxed text-chalk">
        {{ note.how_long }}
      </p>

      <button
        type="button"
        (click)="dismissed.emit()"
        class="mt-6 w-full rounded-xl border border-line bg-surface/50 px-4 py-3.5 text-sm text-mist transition hover:border-line/80 hover:text-chalk"
      >
        Back
      </button>
    </article>
  `,
})
export class EducationNoteComponent {
  @Input({ required: true }) note!: EducationNote;
  @Output() dismissed = new EventEmitter<void>();
}
