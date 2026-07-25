import { buildSituation } from '../services/gemini.service.js';

// Prompt construction is pure, so these run without spending API quota.
describe('buildSituation', () => {
  const CATEGORIES = ['craving', 'panic', 'post_relapse', 'caregiver_checkin'];

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

  it('falls back to the person framing for an unknown role', () => {
    expect(buildSituation('craving', 'wizard')).toBe(buildSituation('craving', 'person'));
  });

  it('still produces a usable line for an unknown category', () => {
    expect(buildSituation('meteor_strike', 'person')).toContain('meteor_strike');
  });
});
