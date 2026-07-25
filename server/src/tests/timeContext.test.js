import { describeTimeOfDay, timeBucket } from '../utils/timeContext.js';

describe('describeTimeOfDay', () => {
  it.each([23, 0, 3, 4])('flags %s:00 as the middle of the night', (hour) => {
    expect(describeTimeOfDay(hour)).toMatch(/middle of the night/);
  });

  it('warns that contacts are asleep overnight, so steps stay actionable', () => {
    expect(describeTimeOfDay(3)).toMatch(/asleep/);
  });

  it.each([
    [7, /early morning/],
    [10, /late morning/],
    [14, /afternoon/],
    [19, /evening/],
    [22, /late at night/],
  ])('describes %s:00 correctly', (hour, expected) => {
    expect(describeTimeOfDay(hour)).toMatch(expected);
  });

  it.each([-1, 24, 3.5, NaN, null, undefined, '3'])('returns null for invalid hour %s', (hour) => {
    expect(describeTimeOfDay(hour)).toBeNull();
  });
});

describe('timeBucket', () => {
  it.each([
    [2, 'night'],
    [23, 'night'],
    [9, 'morning'],
    [15, 'afternoon'],
    [20, 'evening'],
  ])('buckets %s:00 as %s', (hour, expected) => {
    expect(timeBucket(hour)).toBe(expected);
  });

  it('returns null when the hour is unknown', () => {
    expect(timeBucket(undefined)).toBeNull();
  });
});
