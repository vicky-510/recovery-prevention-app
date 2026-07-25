import { Component, Input } from '@angular/core';

/**
 * Shown while the model works. The animation is a slow pulse rather than a
 * spinner, because something to breathe along with is more use here than a
 * progress indicator nobody is reading.
 */
@Component({
  selector: 'app-waiting',
  standalone: true,
  template: `
    <div class="flex min-h-[24rem] flex-col items-center justify-center text-center">
      <div class="relative flex h-20 w-20 items-center justify-center">
        <span class="absolute inset-0 animate-pulse-ring rounded-full bg-calm/30"></span>
        <span
          class="relative h-16 w-16 animate-breathe rounded-full border border-calm/30 bg-calm/10"
          role="status"
          [attr.aria-label]="label"
        ></span>
      </div>
      <p class="mt-8 text-lg text-chalk">{{ label }}</p>
      @if (hint) {
        <p class="mt-1.5 text-sm text-mist">{{ hint }}</p>
      }
    </div>
  `,
})
export class WaitingComponent {
  @Input() label = 'Putting something together for you';
  @Input() hint = 'A few seconds. Breathe until then.';
}
