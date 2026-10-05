import { execFile } from 'node:child_process';
import { access, open, readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, relative, isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { parseLaunchctlList } from './backends/launchd.js';

const execFileAsync = promisify(execFile);

// Scheduled agent tasks run from launchd through ~/Code/tools/scheduled-tasks/run_task.py,
// which records each run in <stateDir>/<slug>.json and appends to history.jsonl.

export const TASK_LABEL_PREFIX = 'com.alexpriest.task.';
// Non-LLM jobs shown alongside the runner's tasks; status comes from launchd, not a state file.
export const SCRIPT_TASKS: Record<string, string> = {
  'com.alexpriest.alice-payroll': 'Alice Payroll',
};

const RECENT_RUNS = 7;
const ERROR_EXCERPT_CHARS = 200;
const LOG_TAIL_BYTES = 8192;

export interface CalendarInterval {
  Minute?: number;
  Hour?: number;
  Day?: number;
  Weekday?: number;
  Month?: number;
}

export interface SchedulePlist {
  Label?: string;
  ProgramArguments?: string[];
  StartInterval?: number;
  StartCalendarInterval?: CalendarInterval | CalendarInterval[];
  StandardOutPath?: string;
  StandardErrorPath?: string;
}

export type RunStatus = 'running' | 'ok' | 'failed';
export type TaskStatus = RunStatus | 'never run';

export interface RunRecord {
  task?: string;
  slug?: string;
  doc?: string;
  session_id?: string;
  started_at?: string;
  finished_at?: string | null;
  status?: RunStatus;
  exit_code?: number | null;
  duration_s?: number | null;
  cost_usd?: number | null;
  result?: string | null;
  error?: string | null;
}

export interface LaunchctlEntry {
  pid: number | null;
  exitCode: number;
}

export interface ScheduledTask {
  label: string;
  name: string;
  slug: string;
  kind: 'llm' | 'script';
  schedule: string;
  nextRun: string | null;
  lastRunStart: string | null;
  lastRunFinish: string | null;
  status: TaskStatus;
  durationS: number | null;
  costUsd: number | null;
  error: string | null;
  docPath: string | null;
  docUrl: string | null;
  recent: RunStatus[];
}

export interface ScheduledOptions {
  launchAgentsDir?: string;
  stateDir?: string;
  vaultRoot?: string;
  tasksDir?: string;
  vaultName?: string;
  now?: Date;
  launchctl?: () => Promise<Map<string, LaunchctlEntry>>;
}

// ─── Schedule text ────────────────────────────────────────────────────

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const normWeekday = (d: number) => d % 7; // launchd accepts 0 and 7 for Sunday
const mondayFirst = (d: number) => (d + 6) % 7;

function formatTime(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')}${suffix}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

function timePart(cal: CalendarInterval): string {
  if (cal.Hour !== undefined) return formatTime(cal.Hour, cal.Minute ?? 0);
  if (cal.Minute !== undefined) return `hourly at :${String(cal.Minute).padStart(2, '0')}`;
  return 'every minute';
}

function dayPart(cal: CalendarInterval): string {
  if (cal.Month !== undefined && cal.Day !== undefined) return `${MONTHS[cal.Month - 1] ?? `Month ${cal.Month}`} ${ordinal(cal.Day)}`;
  if (cal.Month !== undefined) return `Daily in ${MONTHS[cal.Month - 1] ?? `month ${cal.Month}`}`;
  if (cal.Day !== undefined) return `Monthly on the ${ordinal(cal.Day)}`;
  if (cal.Weekday !== undefined) return DAY_PLURAL[normWeekday(cal.Weekday)] ?? `Weekday ${cal.Weekday}`;
  return 'Daily';
}

function formatEntry(cal: CalendarInterval): string {
  const time = timePart(cal);
  const day = dayPart(cal);
  if (day === 'Daily' && cal.Hour === undefined) return time.charAt(0).toUpperCase() + time.slice(1);
  return `${day} ${time}`;
}

function weekdaySetLabel(days: number[]): string {
  const set = [...new Set(days.map(normWeekday))].sort((a, b) => mondayFirst(a) - mondayFirst(b));
  const key = set.join(',');
  if (set.length === 7) return 'Daily';
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '6,0') return 'Weekends';
  if (set.length === 1) return DAY_PLURAL[set[0]];
  return set.map(d => DAY_SHORT[d]).join(', ');
}

export function formatSchedule(plist: Pick<SchedulePlist, 'StartInterval' | 'StartCalendarInterval'>): string {
  if (plist.StartCalendarInterval) {
    const entries = Array.isArray(plist.StartCalendarInterval) ? plist.StartCalendarInterval : [plist.StartCalendarInterval];
    // Entries that differ only by weekday collapse into one phrase ("Weekdays 7:15am").
    const groups = new Map<string, CalendarInterval[]>();
    for (const cal of entries) {
      const key = cal.Weekday === undefined
        ? JSON.stringify(cal)
        : JSON.stringify({ ...cal, Weekday: 'w' });
      groups.set(key, [...(groups.get(key) ?? []), cal]);
    }
    const phrases = [...groups.values()].map(group => {
      if (group.length === 1 || group[0].Weekday === undefined) return group.map(formatEntry).join('; ');
      const days = weekdaySetLabel(group.map(c => c.Weekday!));
      return `${days} ${timePart(group[0])}`;
    });
    return phrases.length > 0 ? phrases.join('; ') : 'Every minute';
  }
  if (plist.StartInterval) {
    const secs = plist.StartInterval;
    if (secs % 3600 === 0) return `Every ${secs / 3600}h`;
    if (secs % 60 === 0) return `Every ${secs / 60} min`;
    return `Every ${secs}s`;
  }
  return 'On demand';
}

// ─── Next run ─────────────────────────────────────────────────────────

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const MAX_LOOKAHEAD_DAYS = 366 * 5; // covers a Feb 29 schedule

function dayMatches(cal: CalendarInterval, date: Date): boolean {
  if (cal.Month !== undefined && date.getMonth() + 1 !== cal.Month) return false;
  const dayOk = cal.Day === undefined || date.getDate() === cal.Day;
  const weekdayOk = cal.Weekday === undefined || date.getDay() === normWeekday(cal.Weekday);
  // launchd follows cron: when both day-of-month and weekday are set, either one matches.
  if (cal.Day !== undefined && cal.Weekday !== undefined) return dayOk || weekdayOk;
  return dayOk && weekdayOk;
}

function nextForEntry(cal: CalendarInterval, now: Date): Date | null {
  const hours = cal.Hour !== undefined ? [cal.Hour] : range(24);
  const minutes = cal.Minute !== undefined ? [cal.Minute] : range(60);
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i++) {
    if (dayMatches(cal, day)) {
      for (const h of hours) {
        for (const m of minutes) {
          const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
          if (candidate.getTime() > now.getTime()) return candidate;
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return null;
}

export function nextRun(cal: CalendarInterval | CalendarInterval[] | undefined, now: Date): Date | null {
  if (!cal) return null;
  const entries = Array.isArray(cal) ? cal : [cal];
  let best: Date | null = null;
  for (const entry of entries) {
    const next = nextForEntry(entry, now);
    if (next && (!best || next < best)) best = next;
  }
  return best;
}

// ─── Links and history ────────────────────────────────────────────────

export function obsidianUrl(path: string | null | undefined, vaultRoot: string, vaultName = 'alexpriest'): string | null {
  if (!path) return null;
  const rel = relative(vaultRoot, path);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  // encodeURIComponent leaves ()!'* alone; Obsidian needs them encoded too.
  const file = encodeURIComponent(rel.replace(/\.md$/, ''))
    .replace(/[()!'*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${file}`;
}

function isRecord(value: unknown): value is RunRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRecord(text: string): RunRecord | null {
  try {
    const value = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** Runs per slug, oldest first, keeping only the final record of each session. */
export function parseHistory(text: string): Map<string, RunRecord[]> {
  const bySession = new Map<string, RunRecord>();
  let anonymous = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const record = parseRecord(line);
    if (!record?.slug) continue;
    bySession.set(record.session_id ?? `anon-${anonymous++}`, record);
  }
  const bySlug = new Map<string, RunRecord[]>();
  for (const record of bySession.values()) {
    bySlug.set(record.slug!, [...(bySlug.get(record.slug!) ?? []), record]);
  }
  for (const runs of bySlug.values()) {
    runs.sort((a, b) => Date.parse(a.started_at ?? '') - Date.parse(b.started_at ?? ''));
  }
  return bySlug;
}

function errorExcerpt(text: string | null | undefined): string | null {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1];
  if (!last) return null;
  return last.length > ERROR_EXCERPT_CHARS ? `${last.slice(0, ERROR_EXCERPT_CHARS - 1)}…` : last;
}

// ─── IO helpers ───────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function readText(path: string): Promise<string | null> {
  try { return await readFile(path, 'utf8'); } catch { return null; }
}

async function readTail(path: string, bytes: number): Promise<string | null> {
  try {
    const handle = await open(path, 'r');
    try {
      const { size } = await handle.stat();
      const start = Math.max(0, size - bytes);
      const buffer = Buffer.alloc(size - start);
      await handle.read(buffer, 0, buffer.length, start);
      return buffer.toString('utf8');
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

async function readPlist(path: string): Promise<SchedulePlist | null> {
  try {
    const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', path]);
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function defaultLaunchctl(): Promise<Map<string, LaunchctlEntry>> {
  try {
    const { stdout } = await execFileAsync('launchctl', ['list']);
    return new Map(parseLaunchctlList(stdout).map(e => [e.label, { pid: e.pid, exitCode: e.exitCode }]));
  } catch {
    return new Map();
  }
}

function taskNameFromArgs(args: string[] | undefined): string | null {
  if (!args) return null;
  const runner = args.findIndex(a => basename(a) === 'run_task.py');
  return runner >= 0 && args[runner + 1] ? args[runner + 1] : null;
}

// ─── Join ─────────────────────────────────────────────────────────────

interface Resolved {
  launchAgentsDir: string;
  stateDir: string;
  vaultRoot: string;
  tasksDir: string;
  vaultName: string;
  now: Date;
  launchctl: Map<string, LaunchctlEntry>;
  history: Map<string, RunRecord[]>;
}

async function docFor(name: string, recorded: string | undefined, opts: Resolved): Promise<{ docPath: string | null; docUrl: string | null }> {
  const candidate = recorded ?? join(opts.tasksDir, `${name}.md`);
  const docPath = recorded || await exists(candidate) ? candidate : null;
  return { docPath, docUrl: obsidianUrl(docPath, opts.vaultRoot, opts.vaultName) };
}

function scheduleFields(plist: SchedulePlist, now: Date) {
  const next = nextRun(plist.StartCalendarInterval, now);
  return { schedule: formatSchedule(plist), nextRun: next ? next.toISOString() : null };
}

async function llmTask(label: string, plist: SchedulePlist, name: string, opts: Resolved): Promise<ScheduledTask> {
  const slug = slugify(name);
  const runs = opts.history.get(slug) ?? [];
  const stateText = await readText(join(opts.stateDir, `${slug}.json`));
  const latest = (stateText ? parseRecord(stateText) : null) ?? runs[runs.length - 1] ?? null;
  const status: TaskStatus = latest?.status ?? 'never run';
  return {
    label,
    name: latest?.task ?? name,
    slug,
    kind: 'llm',
    ...scheduleFields(plist, opts.now),
    lastRunStart: latest?.started_at ?? null,
    lastRunFinish: latest?.finished_at ?? null,
    status,
    durationS: latest?.duration_s ?? null,
    costUsd: latest?.cost_usd ?? null,
    error: status === 'failed' ? errorExcerpt(latest?.error) : null,
    ...await docFor(name, latest?.doc, opts),
    recent: runs.slice(-RECENT_RUNS).map(r => r.status).filter((s): s is RunStatus => !!s),
  };
}

async function scriptTask(label: string, plist: SchedulePlist, name: string, opts: Resolved): Promise<ScheduledTask> {
  const entry = opts.launchctl.get(label);
  const logPath = plist.StandardErrorPath ?? plist.StandardOutPath;
  const logStat = logPath ? await stat(logPath).catch(() => null) : null;
  let status: TaskStatus = 'never run';
  if (entry?.pid) status = 'running';
  else if (entry && entry.exitCode !== 0) status = 'failed';
  else if (logStat) status = 'ok';
  const lastWrite = logStat ? logStat.mtime.toISOString() : null;
  return {
    label,
    name,
    slug: slugify(name),
    kind: 'script',
    ...scheduleFields(plist, opts.now),
    // launchd keeps no run timestamps; the log's last write is the closest record of the last run.
    lastRunStart: lastWrite,
    lastRunFinish: status === 'running' ? null : lastWrite,
    status,
    durationS: null,
    costUsd: null,
    error: status === 'failed' && logPath ? errorExcerpt(await readTail(logPath, LOG_TAIL_BYTES)) : null,
    ...await docFor(name, undefined, opts),
    recent: [],
  };
}

export async function listScheduledTasks(options: ScheduledOptions = {}): Promise<ScheduledTask[]> {
  const home = homedir();
  const vaultRoot = options.vaultRoot ?? join(home, 'Obsidian', 'alexpriest');
  const stateDir = options.stateDir ?? join(home, '.local', 'state', 'scheduled-tasks');
  const launchAgentsDir = options.launchAgentsDir ?? join(home, 'Library', 'LaunchAgents');

  let plistFiles: string[];
  try {
    plistFiles = (await readdir(launchAgentsDir))
      .filter(f => f.endsWith('.plist') && (f.startsWith(TASK_LABEL_PREFIX) || SCRIPT_TASKS[f.slice(0, -'.plist'.length)]));
  } catch {
    plistFiles = [];
  }

  const opts: Resolved = {
    launchAgentsDir,
    stateDir,
    vaultRoot,
    tasksDir: options.tasksDir ?? join(vaultRoot, 'Claude', 'System', 'Scheduled Tasks'),
    vaultName: options.vaultName ?? 'alexpriest',
    now: options.now ?? new Date(),
    launchctl: plistFiles.length > 0 ? await (options.launchctl ?? defaultLaunchctl)() : new Map(),
    history: parseHistory(await readText(join(stateDir, 'history.jsonl')) ?? ''),
  };

  const tasks: ScheduledTask[] = [];
  for (const file of plistFiles) {
    const plist = await readPlist(join(launchAgentsDir, file));
    const label = plist?.Label;
    if (!plist || !label) continue;
    if (SCRIPT_TASKS[label]) {
      tasks.push(await scriptTask(label, plist, SCRIPT_TASKS[label], opts));
    } else if (label.startsWith(TASK_LABEL_PREFIX)) {
      const name = taskNameFromArgs(plist.ProgramArguments) ?? label.slice(TASK_LABEL_PREFIX.length);
      tasks.push(await llmTask(label, plist, name, opts));
    }
  }

  return tasks.sort((a, b) => a.name.localeCompare(b.name));
}
