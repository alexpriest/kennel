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

/**
 * Set or clear one label's purpose in the inventory notes file's [jobs] table,
 * editing that line alone so the file's comments and alignment survive.
 */
export function setInventoryPurpose(text: string, label: string, purpose: string | null): string {
  const lines = text.split('\n');
  const isHeader = (l: string) => /^\s*\[/.test(l);
  const start = lines.findIndex(l => /^\s*\[jobs\]\s*(#.*)?$/.test(l));
  const value = purpose === null ? null : JSON.stringify(purpose.replace(/\s*\n\s*/g, ' ').trim());

  if (start === -1) {
    if (value === null) return text;
    const prefix = text.length === 0 || text.endsWith('\n') ? text : `${text}\n`;
    return `${prefix}${prefix ? '\n' : ''}[jobs]\n${JSON.stringify(label)} = ${value}\n`;
  }

  let end = lines.findIndex((l, i) => i > start && isHeader(l));
  if (end === -1) end = lines.length;
  const key = JSON.stringify(label);
  const keyLine = new RegExp(`^(\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*)`);
  const at = lines.findIndex((l, i) => i > start && i < end && keyLine.test(l));

  if (at !== -1) {
    if (value === null) lines.splice(at, 1);
    else lines[at] = lines[at].match(keyLine)![1] + value;
    return lines.join('\n');
  }
  if (value === null) return text;

  let last = start;
  for (let i = start + 1; i < end; i++) if (/^\s*"/.test(lines[i])) last = i;
  const width = lines[last]?.match(/^(\s*"[^"]*"\s*)=/)?.[1].length ?? key.length + 1;
  lines.splice(last + 1, 0, `${key.padEnd(width)}= ${value}`);
  return lines.join('\n');
}
