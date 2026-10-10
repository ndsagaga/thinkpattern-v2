import { HttpError } from '@/lib/fetch';

// Single labeled key:value pair in the editorial "For the bug report"
// diagnostic block (see FNErrorPlaceholder, design hifi-states.jsx
// FNErrorDetail). Mono lowercase, two-column rendering.
export type DiagnosticEntry = { label: string; value: string };

// Build the diagnostic block from an Error + context. Categorizes:
//   HttpError status === 0   → "timeout"
//   HttpError status > 0     → "http {status}"
//   TypeError                → "network unreachable"
//   anything else            → err.name lowercased, or "unknown"
//
// The output is intentionally short and human-readable — it's editorial
// debug info, not a stack trace. Sentry already captures the full Error.
export function diagnosticFromError(
  err: Error,
  context: { surface: string; id?: string | number },
): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];
  if (context.id !== undefined) {
    entries.push({ label: 'id', value: String(context.id) });
  }
  entries.push({ label: 'surface', value: context.surface });
  entries.push({ label: 'error', value: classifyError(err) });
  entries.push({ label: 'at', value: formatLocalTime(new Date()) });
  return entries;
}

function classifyError(err: Error): string {
  if (err instanceof HttpError) {
    if (err.status === 0) return 'timeout';
    return `http ${err.status}`;
  }
  if (err instanceof TypeError) {
    return 'network unreachable';
  }
  return (err.name || 'error').toLowerCase();
}

// Short user-facing label for an error — used by the FNRefreshToast meta
// line ("No connection" / "Timed out" / "Server error 404"). Distinct from
// classifyError above (which produces lowercase debug labels for the
// diagnostic block); these are sentence-case and meant to read editorially.
export function shortErrorLabel(err: Error): string {
  if (err instanceof HttpError) {
    if (err.status === 0) return 'Timed out';
    if (err.status >= 400) return `Server error ${err.status}`;
    return `Error ${err.status}`;
  }
  if (err instanceof TypeError) return 'No connection';
  return 'Something went wrong';
}

function formatLocalTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
