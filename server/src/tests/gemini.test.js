import {
  buildEducationTopic,
  buildSituation,
  buildVoicePrompt,
} from '../services/gemini.service.js';

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

describe('buildVoicePrompt', () => {
  it('frames the speaker as the person themselves by default', () => {
    expect(buildVoicePrompt('person')).toMatch(/they are going through/);
  });

  it('frames a caregiver as speaking about someone else', () => {
    expect(buildVoicePrompt('caregiver')).toMatch(/someone they care for/);
  });

  it('asks the model to attend to how they sound, not only the words', () => {
    expect(buildVoicePrompt('person')).toMatch(/how they sound/);
  });

  // Silence once produced a confident craving script, so this is pinned.
  it('forbids inventing speech that is not in the audio', () => {
    const prompt = buildVoicePrompt('person');
    expect(prompt).toMatch(/Silence is not a craving/);
    expect(prompt).toMatch(/understood to false/);
  });

  it('carries the time of day through', () => {
    expect(buildVoicePrompt('person', 3)).toMatch(/middle of the night/);
  });

  it('carries personal anchors through', () => {
    const prompt = buildVoicePrompt('person', 14, { firstName: 'John', safeContactName: 'Rahul' });
    expect(prompt).toContain('John');
    expect(prompt).toContain('Rahul');
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
