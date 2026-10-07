import { execFile } from 'node:child_process';
import { access, open, readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, relative, isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { parseLaunchctlList } from './backends/launchd.js';
import { formatSchedule, nextRun, type CalendarInterval } from './schedule.js';

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
