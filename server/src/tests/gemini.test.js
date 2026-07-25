import { buildEducationTopic, buildSituation } from '../services/gemini.service.js';

const CATEGORIES = ['craving', 'panic', 'post_relapse', 'caregiver_checkin'];

// Prompt construction is pure, so these run without spending API quota.
describe('buildSituation', () => {
  it.each(CATEGORIES)('gives a person and a caregiver different framing for %s', (category) => {
    expect(buildSituation(category, 'caregiver')).not.toBe(buildSituation(category, 'person'));
  });

  it.each(CATEGORIES)('addresses the person directly for %s', (category) => {
    expect(buildSituation(category, 'person')).toMatch(/^You /);
  });

  it.each(['craving', 'panic', 'post_relapse'])(
    'frames %s around a third party for a caregiver',
    (category) => {
      expect(buildSituation(category, 'caregiver')).toMatch(/someone you care for/i);
    }
  );

  it('appends the time of day when the local hour is known', () => {
    expect(buildSituation('craving', 'person', 3)).toMatch(/middle of the night/);
  });

  it('omits any time reference when the hour is unknown', () => {
    expect(buildSituation('craving', 'person')).toBe(buildSituation('craving', 'person', 99));
  });

  it('falls back to the person framing for an unknown role', () => {
    expect(buildSituation('craving', 'wizard')).toBe(buildSituation('craving', 'person'));
  });

  it('still produces a usable line for an unknown category', () => {
    expect(buildSituation('meteor_strike', 'person')).toContain('meteor_strike');
  });
});

describe('buildEducationTopic', () => {
  it.each(CATEGORIES)('gives a person and a caregiver different topics for %s', (category) => {
    expect(buildEducationTopic(category, 'caregiver')).not.toBe(
      buildEducationTopic(category, 'person')
    );
  });

  it('falls back to the person topic for an unknown role', () => {
    expect(buildEducationTopic('panic', 'wizard')).toBe(buildEducationTopic('panic', 'person'));
  });

  it('still produces a usable topic for an unknown category', () => {
    expect(buildEducationTopic('meteor_strike', 'person')).toContain('meteor_strike');
  });
});
