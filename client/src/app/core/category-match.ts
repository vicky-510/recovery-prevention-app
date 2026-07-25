import { Category } from '../models';

/**
 * Maps what someone actually says onto a category. People in crisis do not say
 * "post relapse" — they say "I used" or "I slipped" — so each category carries
 * a set of natural phrasings alongside its own label.
 */
const SPOKEN_CUES: Record<string, string[]> = {
  craving: ['craving', 'crave', 'urge', 'want to use', 'tempted', 'need a drink', 'using'],
  panic: ['panic', 'panicking', 'anxious', 'anxiety', 'scared', 'freaking out', 'cant breathe'],
  post_relapse: ['relapse', 'relapsed', 'i used', 'slipped', 'i drank', 'messed up', 'failed'],
  caregiver_checkin: ['check in', 'checkin', 'caregiver', 'help them', 'support', 'someone else'],
};

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, '');
}

/**
 * Returns the best matching category code, or null if nothing matched.
 * Exported separately from the component so it can be unit tested.
 */
export function matchCategory(spoken: string[], categories: Category[]): string | null {
  const heard = spoken.map(normalise);
  const known = new Set(categories.map((c) => c.code));

  for (const phrase of heard) {
    if (!phrase) continue;

    for (const [code, cues] of Object.entries(SPOKEN_CUES)) {
      if (!known.has(code)) continue;
      if (cues.some((cue) => phrase.includes(cue))) return code;
    }

    // Fall back to the category's own label, e.g. someone reading the button.
    const byLabel = categories.find((c) => phrase.includes(normalise(c.label)));
    if (byLabel) return byLabel.code;
  }

  return null;
}
