// Extract the host from a URL safely. Used as a low-cardinality property
// on external_link_opened events — publisher domain is useful product
// analytics, full URL is too noisy and potentially PII-adjacent (query
// strings can contain identifiers, tracking params, etc.).
export function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}
