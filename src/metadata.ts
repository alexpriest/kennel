import { parse } from 'smol-toml';

// Names, purposes and domains for jobs. Everything personal comes from config or the
// inventory notes file; the defaults here work on any Mac.

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function matchesAny(label: string, patterns: string[]): boolean {
  return patterns.some(p => globToRegExp(p).test(label));
}

/** Alias if configured, else the last segment of a reverse-DNS label, humanized. */
export function displayName(label: string, aliases: Record<string, string>): string {
  if (aliases[label]) return aliases[label];
  const segments = label.split('.');
  const tail = segments.length >= 3 ? segments[segments.length - 1] : label;
  const words = tail.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** First domain whose patterns match, in config order. */
export function domainFor(label: string, domains: Record<string, string[]>, fallback: string): string {
  for (const [domain, patterns] of Object.entries(domains)) {
    if (matchesAny(label, patterns)) return domain;
  }
  return fallback;
}

/** With no patterns configured, every job is the user's own; otherwise only matches are. */
export function isOwnLabel(label: string, ownPatterns: string[]): boolean {
  return ownPatterns.length === 0 || matchesAny(label, ownPatterns);
}

/** Purposes keyed by launchd label from a system-inventory-notes TOML file's [jobs] table. */
export function parseInventoryNotes(text: string): Record<string, string> {
  try {
    const jobs = parse(text).jobs;
    if (typeof jobs !== 'object' || jobs === null || Array.isArray(jobs)) return {};
    return Object.fromEntries(
      Object.entries(jobs).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}
