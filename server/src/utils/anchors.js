/**
 * Personal anchors are the difference between advice and a script addressed to
 * someone. A named person to call beats "a trusted person", and a streak the
 * reader earned is evidence they have already survived this.
 */

const MAX_ANCHOR_LENGTH = 40;

/**
 * Anchors are user-supplied text that ends up inside a prompt, so they are
 * length-capped and stripped of line breaks to keep them from being read as
 * instructions of their own.
 */
function sanitise(value) {
  if (typeof value !== 'string') return null;

  const cleaned = value.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_ANCHOR_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function describeStreak(days) {
  if (!Number.isInteger(days) || days < 0) return null;
  if (days === 0) return 'Today is day one.';
  if (days === 1) return 'They have been sober for 1 day.';
  return `They have been sober for ${days} days.`;
}

/**
 * Builds the anchor lines appended to a prompt. Returns an empty string when
 * the reader has given nothing, so an anonymous user still gets a usable script.
 */
export function buildAnchors({ firstName, daysSober, safeContactName, role } = {}) {
  const lines = [];

  const name = sanitise(firstName);
  if (name) lines.push(`The reader's name is ${name}; use it once, naturally.`);

  // A caregiver's own sobriety streak is not what this moment is about.
  if (role !== 'caregiver') {
    const streak = describeStreak(daysSober);
    if (streak) lines.push(`${streak} Treat it as proof they have done this before.`);
  }

  const contact = sanitise(safeContactName);
  if (contact) {
    lines.push(`If a step suggests reaching out, name ${contact} rather than "someone".`);
  }

  return lines.join('\n');
}
