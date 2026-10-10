import { formatActorUpdated } from './time';

// Fixed "now" so the relative buckets are deterministic. Mid-day local avoids
// day-boundary flakiness in the calendar-day math.
const NOW = new Date('2026-07-11T12:00:00');
const iso = (d: Date) => d.toISOString();
const hoursAgo = (h: number) => iso(new Date(NOW.getTime() - h * 3_600_000));
const daysAgo = (d: number) => iso(new Date(NOW.getTime() - d * 86_400_000));

describe('formatActorUpdated', () => {
  test('sub-hour reads "just now"', () => {
    expect(formatActorUpdated(hoursAgo(0.5), NOW)).toBe('Updated just now');
  });

  test('future timestamps (clock skew) clamp to "just now"', () => {
    expect(formatActorUpdated(hoursAgo(-3), NOW)).toBe('Updated just now');
  });

  test('intra-day counts rounded hours', () => {
    expect(formatActorUpdated(hoursAgo(3), NOW)).toBe('Updated 3h ago');
    expect(formatActorUpdated(hoursAgo(1.6), NOW)).toBe('Updated 2h ago');
  });

  test('one calendar day back reads "yesterday"', () => {
    expect(formatActorUpdated(daysAgo(1), NOW)).toBe('Updated yesterday');
  });

  test('within a week counts days', () => {
    expect(formatActorUpdated(daysAgo(4), NOW)).toBe('Updated 4d ago');
  });

  test('a week or older falls back to a short date', () => {
    expect(formatActorUpdated(daysAgo(10), NOW)).toBe('Updated Jul 1');
  });

  test('unparseable input yields an empty string', () => {
    expect(formatActorUpdated('not-a-date', NOW)).toBe('');
  });
});
