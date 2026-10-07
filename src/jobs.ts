import { basename } from 'node:path';
import { prevRun, type CalendarInterval, type ScheduleFields } from './schedule.js';

// The job model: what kind of thing a launchd job is, and what state it is honestly in.
// Pure functions only; IO lives in collect.ts.

export interface JobPlist extends ScheduleFields {
  Label?: string;
  Program?: string;
  ProgramArguments?: string[];
  KeepAlive?: boolean | Record<string, unknown>;
  RunAtLoad?: boolean;
  WatchPaths?: string[];
  QueueDirectories?: string[];
  StandardOutPath?: string;
  StandardErrorPath?: string;
  WorkingDirectory?: string;
}

export type Trigger = 'keepalive' | 'calendar' | 'interval' | 'watch' | 'once' | 'login' | 'demand';
export type JobKind = 'daemon' | 'scheduled' | 'agent';
export type DaemonState = 'up' | 'down' | 'flapping' | 'unhealthy';
export type LastResult = 'ok' | 'failed' | 'running' | 'never' | 'unknown';
export type Timing = 'on-time' | 'missed' | 'n/a' | 'unknown';

const FLAP_RESTARTS = 3;
const UNHEALTHY_WINDOW_S = 10 * 60;

function isRunOnce(keepAlive: Record<string, unknown>): boolean {
  const keys = Object.keys(keepAlive);
  return keys.length === 1 && keepAlive.SuccessfulExit === false;
}

export function detectTrigger(plist: JobPlist): Trigger {
  const keepAlive = plist.KeepAlive;
  if (keepAlive === true) return 'keepalive';
  if (keepAlive && typeof keepAlive === 'object') {
    return isRunOnce(keepAlive) ? 'once' : 'keepalive';
  }
  if (plist.StartCalendarInterval) return 'calendar';
  if (plist.StartInterval) return 'interval';
  if (plist.WatchPaths?.length || plist.QueueDirectories?.length) return 'watch';
  if (plist.RunAtLoad) return 'login';
  return 'demand';
}

/** Agent jobs run an LLM session through run_task.py or `kennel-run --agent`. */
export function isAgentCommand(args: string[] | undefined): boolean {
  if (!args) return false;
  if (args.some(a => basename(a) === 'run_task.py')) return true;
  const runner = args.findIndex(a => basename(a) === 'kennel-run');
  return runner >= 0 && args.slice(runner + 1).includes('--agent');
}

export function jobKind(plist: JobPlist): JobKind {
  if (detectTrigger(plist) === 'keepalive') return 'daemon';
  return isAgentCommand(plist.ProgramArguments) ? 'agent' : 'scheduled';
}

export interface DaemonFacts {
  loaded: boolean;
  pid: number | null;
  lastExit: number | null;
  uptimeS: number | null;
  /** Times launchd started it within the flap window, beyond the first observed start. */
  restartsInWindow: number;
}

export function deriveDaemonState(f: DaemonFacts): DaemonState {
  if (f.restartsInWindow >= FLAP_RESTARTS) return 'flapping';
  if (!f.loaded || !f.pid) return 'down';
  const crashed = f.lastExit !== null && f.lastExit !== 0;
  if (crashed && f.uptimeS !== null && f.uptimeS <= UNHEALTHY_WINDOW_S) return 'unhealthy';
  return 'up';
}

export interface RunSummary {
  startedAt: Date;
  finishedAt: Date | null;
  exitCode: number | null;
}

export interface ScheduledFacts {
  loaded: boolean;
  disabled: boolean;
  running: boolean;
  trigger: Trigger;
  calendar?: CalendarInterval | CalendarInterval[];
  interval?: number;
  /** null: a record source exists and the job never ran. undefined: no record source. */
  lastRun: RunSummary | null | undefined;
  /** launchd's last exit code, used when there is no run record. */
  lastExit?: number | null;
  installedAt: Date;
  now: Date;
  graceS: number;
}

export interface ScheduledState {
  schedule: 'active' | 'paused';
  last: LastResult;
  timing: Timing;
}

function lastResult(f: ScheduledFacts): LastResult {
  if (f.running) return 'running';
  if (f.lastRun === undefined) {
    if (f.lastExit === undefined || f.lastExit === null) return 'unknown';
    return f.lastExit === 0 ? 'ok' : 'failed';
  }
  if (f.lastRun === null) return 'never';
  if (f.lastRun.finishedAt === null && f.lastRun.exitCode === null) return 'running';
  return f.lastRun.exitCode === 0 ? 'ok' : 'failed';
}

function timing(f: ScheduledFacts): Timing {
  if (f.trigger !== 'calendar' && f.trigger !== 'interval') return 'n/a';
  if (f.lastRun === undefined) return 'unknown';
  if (f.running) return 'on-time';
  const graceMs = f.graceS * 1000;
  const lastStart = f.lastRun?.startedAt.getTime() ?? null;

  if (f.trigger === 'calendar') {
    const due = prevRun(f.calendar, new Date(f.now.getTime() - graceMs));
    if (!due || due < f.installedAt) return 'on-time';
    // launchd may start a minute late; anything starting after the slot opened counts.
    return lastStart !== null && lastStart >= due.getTime() - 60_000 ? 'on-time' : 'missed';
  }

  const intervalMs = (f.interval ?? 0) * 1000;
  const since = lastStart ?? f.installedAt.getTime();
  return f.now.getTime() - since > 2 * intervalMs + graceMs ? 'missed' : 'on-time';
}

export function deriveScheduledState(f: ScheduledFacts): ScheduledState {
  const paused = !f.loaded || f.disabled;
  return {
    schedule: paused ? 'paused' : 'active',
    last: lastResult(f),
    timing: paused ? 'n/a' : timing(f),
  };
}
