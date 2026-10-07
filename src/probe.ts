import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Reads process and launchd facts from the live machine. Parsers are pure and tested.

const execFileAsync = promisify(execFile);

export interface PsRow {
  pid: number;
  ppid: number;
  etimeS: number | null;
  rssKb: number;
}

export function parseEtime(text: string): number | null {
  const match = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(text.trim());
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  return Number(days ?? 0) * 86400 + Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export function parsePsTable(output: string): Map<number, PsRow> {
  const rows = new Map<number, PsRow>();
  for (const line of output.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const [pid, ppid, etime, rss] = parts;
    rows.set(Number(pid), { pid: Number(pid), ppid: Number(ppid), etimeS: parseEtime(etime), rssKb: Number(rss) });
  }
  return rows;
}

export interface TreeStats {
  uptimeS: number | null;
  rssKb: number;
  processes: number;
}

/** A launcher wrapper's own pid under-reports memory, so sum every descendant. */
export function treeStats(table: Map<number, PsRow>, pid: number): TreeStats | null {
  const root = table.get(pid);
  if (!root) return null;
  const children = new Map<number, number[]>();
  for (const row of table.values()) {
    children.set(row.ppid, [...(children.get(row.ppid) ?? []), row.pid]);
  }
  let rssKb = 0;
  let processes = 0;
  const stack = [pid];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const row = table.get(current);
    if (!row) continue;
    rssKb += row.rssKb;
    processes += 1;
    stack.push(...(children.get(current) ?? []));
  }
  return { uptimeS: root.etimeS, rssKb, processes };
}

export interface LaunchctlPrint {
  state: string | null;
  runs: number | null;
  pid: number | null;
  lastExit: number | null;
}

/** Top-level fields of `launchctl print gui/<uid>/<label>` (one tab deep, not nested blocks). */
export function parseLaunchctlPrint(output: string): LaunchctlPrint {
  const top = new Map<string, string>();
  for (const line of output.split('\n')) {
    const match = /^\t([a-z ]+) = (.*)$/.exec(line);
    if (match && !top.has(match[1])) top.set(match[1], match[2].trim());
  }
  const int = (key: string) => {
    const value = top.get(key);
    return value !== undefined && /^-?\d+$/.test(value) ? Number(value) : null;
  };
  return { state: top.get('state') ?? null, runs: int('runs'), pid: int('pid'), lastExit: int('last exit code') };
}

export function parseDisabled(output: string): Set<string> {
  const disabled = new Set<string>();
  for (const match of output.matchAll(/"([^"]+)" => (disabled|true)/g)) disabled.add(match[1]);
  return disabled;
}

/** Remembers launchd's run counter per job to count restarts inside a sliding window. */
export class FlapTracker {
  private samples = new Map<string, { at: number; runs: number }[]>();

  constructor(private windowS: number) {}

  /** Returns how many times the job started within the window. */
  observe(label: string, runs: number, atMs: number): number {
    let samples = this.samples.get(label) ?? [];
    if (samples.length > 0 && runs < samples[samples.length - 1].runs) samples = [];
    samples.push({ at: atMs, runs });
    samples = samples.filter(s => atMs - s.at <= this.windowS * 1000);
    this.samples.set(label, samples);
    return runs - samples[0].runs;
  }
}

export async function readPsTable(): Promise<Map<number, PsRow>> {
  try {
    const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid=,etime=,rss=']);
    return parsePsTable(stdout);
  } catch {
    return new Map();
  }
}

export async function readLaunchctlPrint(domain: string, label: string): Promise<LaunchctlPrint | null> {
  try {
    const { stdout } = await execFileAsync('launchctl', ['print', `${domain}/${label}`]);
    return parseLaunchctlPrint(stdout);
  } catch {
    return null;
  }
}

export async function readDisabled(domain: string): Promise<Set<string>> {
  try {
    const { stdout } = await execFileAsync('launchctl', ['print-disabled', domain]);
    return parseDisabled(stdout);
  } catch {
    return new Set();
  }
}
