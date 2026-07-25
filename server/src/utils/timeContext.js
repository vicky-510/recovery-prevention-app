/**
 * A craving at 3am is a different problem from one at 2pm: fewer people are
 * awake, and advice to "call someone" can land as a dead end. The caller's
 * local hour is passed to the model so the steps stay actionable.
 */
export function describeTimeOfDay(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;

  if (hour >= 23 || hour < 5) {
    return 'It is the middle of the night, so most people they could call are asleep.';
  }
  if (hour < 9) return 'It is early morning.';
  if (hour < 12) return 'It is late morning.';
  if (hour < 17) return 'It is the afternoon.';
  if (hour < 21) return 'It is the evening.';
  return 'It is late at night.';
}

/** Short label stored alongside the intervention for context. */
export function timeBucket(hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (hour >= 23 || hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
