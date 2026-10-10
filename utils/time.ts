// Pure date formatters. All take ISO 8601 strings or Date objects.

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// "2h ago", "5m ago", "3d ago", or for older: "Mar 13".
export function formatRecency(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// "Mar 23" — short calendar date from a full ISO datetime (e.g.
// "2026-05-08T13:00:00Z"). Rendered in the viewer's local timezone.
// For date-only strings ("YYYY-MM-DD") use formatCalendarDate — passing
// one here would parse as UTC midnight and shift a day west of UTC.
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// "2:14 PM" — local 12-hour wall-clock. Private; shared by the formatters below.
function clock12(d: Date): string {
  const h = d.getHours() % 12 || 12;
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${mm} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

// "2:14 PM" from an epoch-ms timestamp — the time on a reading-history row.
export function formatClock(at: number): string {
  return clock12(new Date(at));
}

// "Today" / "Yesterday" / "Jul 8" — the day bucket a saved/history entry falls
// in, by local calendar day. Consumer (FNCap) uppercases it.
export function formatDayLabel(at: number, now: Date = new Date()): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(now.getTime()) - startOfDay(at)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const d = new Date(at);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// "Jun 16, 2026" — full date for a perspective's published_at. The eyebrow on
// the feed card (FNCap uppercases it to "JUN 16, 2026"). Rendered in the
// viewer's local timezone.
export function formatPerspectiveDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// "Mar 23" from a date-only string "YYYY-MM-DD". Used for backend fields
// that mean "this calendar day" rather than "this instant" — currently
// only `anchor_date` on milestones. Splits the string manually because
// `new Date('2026-05-08')` parses as UTC midnight, which renders as the
// previous day for any viewer west of UTC.
export function formatCalendarDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} ${Number(d)}`;
}

// "Updated 2:14p"
export function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const h12 = d.getHours() % 12 || 12;
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() < 12 ? 'a' : 'p';
  return `Updated ${h12}:${mm}${ampm}`;
}

// "Updated just now" / "Updated 3h ago" / "Updated yesterday" / "Updated 4d ago"
// / "Updated Jun 16" — the freshness stamp on an actor's living dossier
// (updated_at). Mirrors design actorUpdatedLabel: sub-hour reads "just now",
// intra-day counts hours, then day-buckets (calendar days, not 24h windows) out
// to a week, then falls back to a short date. Future timestamps (clock skew)
// clamp to "just now".
export function formatActorUpdated(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const hours = (now.getTime() - then) / 3_600_000;
  if (hours < 1) return 'Updated just now';
  if (hours < 24) return `Updated ${Math.round(hours)}h ago`;
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(now.getTime()) - startOfDay(then)) / 86_400_000);
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days}d ago`;
  const d = new Date(iso);
  return `Updated ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// "6h 14m ago" — finer-grained than formatRecency for the FNStaleBrief
// banner where the user wants to know precisely how stale their cached
// brief is. Falls back to relative day count for week-old or older.
export function formatStaleAge(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diffMs = Math.max(0, now.getTime() - then);
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) {
    const remMin = minutes - hours * 60;
    return remMin === 0 ? `${hours}h ago` : `${hours}h ${remMin}m ago`;
  }
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
