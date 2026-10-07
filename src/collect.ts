import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseLaunchctlList } from './backends/launchd.js';
import { PM2Backend, BrewBackend } from './backends/index.js';
import { loadConfig, expandHome, type KennelConfig } from './config.js';
import {
  detectTrigger, jobKind, deriveDaemonState, deriveScheduledState,
  type JobPlist, type JobKind, type Trigger, type DaemonState, type ScheduledState, type RunSummary,
} from './jobs.js';
import { displayName, domainFor, isOwnLabel, parseInventoryNotes } from './metadata.js';
import { FlapTracker, readDisabled, readLaunchctlPrint, readPsTable, treeStats, type PsRow } from './probe.js';
import { readRuns, type LabelRuns, type RunStatus } from './runs.js';
import { formatSchedule, nextRun } from './schedule.js';
import { isWrapped } from './wrap.js';
import { obsidianUrl, parseHistory, slugify, taskNameFromArgs, type RunRecord } from './scheduled.js';
import type { BackendType, Service } from './types.js';

const execFileAsync = promisify(execFile);
const FLAP_WINDOW_S = 10 * 60;
const LOG_TAIL_CHARS = 2000;

export interface JobRun {
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  durationS: number | null;
  logTail: string | null;
}

export interface Job {
  id: string;
  backend: BackendType;
  name: string;
  purpose: string | null;
  domain: string;
  own: boolean;
  kind: JobKind;
  trigger: Trigger;
  schedule: string | null;
  pid: number | null;
  configPath: string | null;
  logPaths: { stdout: string | null; stderr: string | null };
  daemon?: {
    state: DaemonState;
    /** Start of the current process; the UI derives a live uptime from it. */
    startedAt: string | null;
    memoryMb: number | null;
    processes: number | null;
    restartsInWindow: number;
    lastExit: number | null;
  };
  scheduled?: ScheduledState & {
    nextRun: string | null;
    lastRun: JobRun | null;
    recent: RunStatus[];
    source: 'kennel-run' | 'run_task' | 'launchd';
    docUrl: string | null;
  };
}

// ─── Plist cache ──────────────────────────────────────────────────────

const plistCache = new Map<string, { mtimeMs: number; plist: JobPlist | null }>();

async function readPlistCached(path: string): Promise<{ plist: JobPlist | null; mtime: Date } | null> {
  const info = await stat(path).catch(() => null);
  if (!info) return null;
  const cached = plistCache.get(path);
  if (cached && cached.mtimeMs === info.mtimeMs) return { plist: cached.plist, mtime: info.mtime };
  let plist: JobPlist | null = null;
  try {
    const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', path]);
    plist = JSON.parse(stdout);
  } catch {
    plist = null;
  }
  plistCache.set(path, { mtimeMs: info.mtimeMs, plist });
  return { plist, mtime: info.mtime };
}

// ─── Agent task records (run_task.py) ─────────────────────────────────

interface AgentTaskSources {
  stateDir: string;
  vaultRoot: string;
  tasksDir: string;
  vaultName: string;
  history: Map<string, RunRecord[]>;
}

async function agentSources(config: KennelConfig): Promise<AgentTaskSources> {
  const home = homedir();
  const vaultRoot = expandHome(config.agentTasks?.vaultRoot ?? join(home, 'Obsidian', 'alexpriest'));
  const stateDir = expandHome(config.agentTasks?.stateDir ?? join(home, '.local', 'state', 'scheduled-tasks'));
  const historyText = await readFile(join(stateDir, 'history.jsonl'), 'utf8').catch(() => '');
  return {
    stateDir,
    vaultRoot,
    tasksDir: expandHome(config.agentTasks?.tasksDir ?? join(vaultRoot, 'Claude', 'System', 'Scheduled Tasks')),
    vaultName: config.agentTasks?.vaultName ?? 'alexpriest',
    history: parseHistory(historyText),
  };
}

function runFromTaskRecord(record: RunRecord): RunSummary & { durationS: number | null; logTail: string | null } {
  return {
    startedAt: new Date(record.started_at ?? 0),
    finishedAt: record.finished_at ? new Date(record.finished_at) : null,
    exitCode: record.status === 'running' ? null : record.exit_code ?? (record.status === 'ok' ? 0 : 1),
    durationS: record.duration_s ?? null,
    logTail: record.error ?? null,
  };
}

async function taskRecord(name: string, sources: AgentTaskSources) {
  const slug = slugify(name);
  const runs = sources.history.get(slug) ?? [];
  const latestText = await readFile(join(sources.stateDir, `${slug}.json`), 'utf8').catch(() => null);
  let latest: RunRecord | null = null;
  try { latest = latestText ? JSON.parse(latestText) : null; } catch { latest = null; }
  latest = latest ?? runs[runs.length - 1] ?? null;
  const docPath = latest?.doc ?? join(sources.tasksDir, `${name}.md`);
  const docExists = await stat(docPath).then(() => true, () => false);
  return {
    latest,
    recent: runs.slice(-7).map(r => r.status).filter((s): s is RunStatus => !!s),
    docUrl: docExists ? obsidianUrl(docPath, sources.vaultRoot, sources.vaultName) : null,
  };
}

// ─── Collection ───────────────────────────────────────────────────────

export interface CollectOptions {
  launchAgentsDir?: string;
  now?: Date;
  runsDir?: string;
}

const flaps = new FlapTracker(FLAP_WINDOW_S);

function toJobRun(run: (RunSummary & { durationS: number | null; logTail: string | null }) | null): JobRun | null {
  if (!run) return null;
  return {
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    exitCode: run.exitCode,
    durationS: run.durationS,
    logTail: run.logTail ? run.logTail.slice(-LOG_TAIL_CHARS) : null,
  };
}

function fromKennelRun(runs: LabelRuns) {
  const r = runs.latest;
  return {
    startedAt: new Date(r.started_at),
    finishedAt: r.finished_at ? new Date(r.finished_at) : null,
    exitCode: r.exit_code,
    durationS: r.duration_s,
    logTail: r.log_tail,
  };
}

async function launchdJobs(config: KennelConfig, opts: CollectOptions, ps: Map<number, PsRow>): Promise<Job[]> {
  const uid = process.getuid?.() ?? 501;
  const domain = `gui/${uid}`;
  const dir = opts.launchAgentsDir ?? join(homedir(), 'Library', 'LaunchAgents');
  const now = opts.now ?? new Date();
  const files = (await readdir(dir).catch(() => [] as string[])).filter(f => f.endsWith('.plist'));

  const [listOut, disabled, kennelRuns, agents, notesText] = await Promise.all([
    execFileAsync('launchctl', ['list']).then(r => r.stdout, () => ''),
    readDisabled(domain),
    readRuns(opts.runsDir),
    agentSources(config),
    config.inventoryNotes ? readFile(expandHome(config.inventoryNotes), 'utf8').catch(() => '') : Promise.resolve(''),
  ]);
  const loaded = new Map(parseLaunchctlList(listOut).map(e => [e.label, e]));
  const purposes = parseInventoryNotes(notesText);
  const graceS = (config.missedGraceMinutes ?? 30) * 60;

  const jobs = await Promise.all(files.map(async (file): Promise<Job | null> => {
    const path = join(dir, file);
    const read = await readPlistCached(path);
    const plist = read?.plist;
    const label = plist?.Label;
    if (!read || !plist || !label || label.startsWith('homebrew.mxcl.')) return null;

    const entry = loaded.get(label);
    const pid = entry?.pid ?? null;
    const kind = jobKind(plist, config.kinds?.[label]);
    const trigger = detectTrigger(plist);
    const job: Job = {
      id: label,
      backend: 'launchd',
      name: displayName(label, config.aliases),
      purpose: config.notes[label] ?? purposes[label] ?? null,
      domain: domainFor(label, config.domains ?? {}, config.defaultDomain ?? 'other'),
      own: isOwnLabel(label, config.ownLabels ?? []),
      kind,
      trigger,
      schedule: kind === 'daemon' ? null : scheduleText(plist, trigger),
      pid,
      configPath: path,
      logPaths: { stdout: plist.StandardOutPath ?? null, stderr: plist.StandardErrorPath ?? null },
    };

    if (kind === 'daemon') {
      const printed = entry ? await readLaunchctlPrint(domain, label) : null;
      const tree = pid ? treeStats(ps, pid, now) : null;
      const restartsInWindow = printed?.runs != null ? Math.max(0, flaps.observe(label, printed.runs, now.getTime())) : 0;
      const lastExit = printed?.lastExit ?? entry?.exitCode ?? null;
      job.daemon = {
        state: deriveDaemonState({ loaded: !!entry, pid, lastExit, uptimeS: tree?.uptimeS ?? null, restartsInWindow }),
        startedAt: tree?.startedAt?.toISOString() ?? null,
        memoryMb: tree ? memoryMb(tree.rssKb) : null,
        processes: tree?.processes ?? null,
        restartsInWindow,
        lastExit,
      };
      return job;
    }

    let lastRun: (RunSummary & { durationS: number | null; logTail: string | null }) | null | undefined;
    let recent: RunStatus[] = [];
    let source: 'kennel-run' | 'run_task' | 'launchd' = 'launchd';
    let docUrl: string | null = null;
    const taskName = taskNameFromArgs(plist.ProgramArguments);
    const wrapped = kennelRuns.get(label);
    if (wrapped) {
      lastRun = fromKennelRun(wrapped);
      recent = wrapped.recent;
      source = 'kennel-run';
    } else if (isWrapped(plist.ProgramArguments ?? [])) {
      lastRun = null; // wrapped, and no run since
      source = 'kennel-run';
    } else if (taskName) {
      const task = await taskRecord(taskName, agents);
      lastRun = task.latest ? runFromTaskRecord(task.latest) : null;
      recent = task.recent;
      docUrl = task.docUrl;
      source = 'run_task';
    }

    const state = deriveScheduledState({
      loaded: !!entry,
      disabled: disabled.has(label),
      running: !!pid,
      trigger,
      calendar: plist.StartCalendarInterval,
      interval: plist.StartInterval,
      lastRun,
      lastExit: entry?.exitCode ?? null,
      installedAt: read.mtime,
      now,
      graceS,
    });
    const next = trigger === 'calendar' ? nextRun(plist.StartCalendarInterval, now) : null;
    job.scheduled = { ...state, nextRun: next?.toISOString() ?? null, lastRun: toJobRun(lastRun ?? null), recent, source, docUrl };
    return job;
  }));

  return jobs.filter((j): j is Job => j !== null);
}

/** Whole megabytes, so the pushed list does not churn on every kilobyte. */
function memoryMb(rssKb: number): number {
  return Math.max(1, Math.round(rssKb / 1024));
}

function scheduleText(plist: JobPlist, trigger: Trigger): string {
  switch (trigger) {
    case 'calendar':
    case 'interval': return formatSchedule(plist);
    case 'watch': return 'When files change';
    case 'once': return 'Once, until it succeeds';
    case 'login': return 'At login';
    default: return 'On demand';
  }
}

/** PM2 and Homebrew services are daemons for the purposes of the job list. */
function serviceJob(service: Service, config: KennelConfig, ps: Map<number, PsRow>): Job {
  const tree = service.pid ? treeStats(ps, service.pid) : null;
  const up = service.status === 'running';
  return {
    id: service.backendId,
    backend: service.backend,
    name: displayName(service.backendId, config.aliases),
    purpose: config.notes[service.backendId] ?? null,
    domain: domainFor(service.backendId, config.domains ?? {}, config.defaultDomain ?? 'other'),
    own: isOwnLabel(service.backendId, config.ownLabels ?? []),
    kind: 'daemon',
    trigger: 'keepalive',
    schedule: null,
    pid: service.pid ?? null,
    configPath: service.configPath ?? null,
    logPaths: { stdout: service.logPaths?.stdout ?? null, stderr: service.logPaths?.stderr ?? null },
    daemon: {
      state: up ? 'up' : 'down',
      startedAt: tree?.startedAt?.toISOString() ?? null,
      memoryMb: tree ? memoryMb(tree.rssKb) : null,
      processes: tree?.processes ?? null,
      restartsInWindow: 0,
      lastExit: service.exitCode ?? null,
    },
  };
}

async function otherBackendJobs(config: KennelConfig, ps: Map<number, PsRow>): Promise<Job[]> {
  const backends = [new PM2Backend(), new BrewBackend()];
  const lists = await Promise.all(backends.map(async b => (await b.isAvailable()) ? b.list().catch(() => []) : []));
  return lists.flat().map(s => serviceJob(s, config, ps));
}

export async function listJobs(opts: CollectOptions = {}): Promise<Job[]> {
  const [config, ps] = await Promise.all([loadConfig(), readPsTable()]);
  const [launchd, others] = await Promise.all([launchdJobs(config, opts, ps), otherBackendJobs(config, ps)]);
  return [...launchd, ...others].sort((a, b) => a.name.localeCompare(b.name));
}
