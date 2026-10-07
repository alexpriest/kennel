import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// kennel-run: wraps a scheduled job so every run leaves a record Kennel can read.
// <stateDir>/<label>.json holds the latest run; history.jsonl appends every record.

export const RUNS_DIR = join(homedir(), '.local', 'state', 'kennel', 'runs');
const TAIL_BYTES = 8192;
const RECENT_RUNS = 7;

export type RunStatus = 'running' | 'ok' | 'failed';

export interface KennelRunRecord {
  label: string;
  run_id: string;
  kind: 'agent' | 'scheduled';
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  exit_code: number | null;
  duration_s: number | null;
  log_tail: string | null;
  /** Carried over from launchd when the job was first wrapped; times come from the log file. */
  seeded?: boolean;
}

export class TailBuffer {
  private chunks: Buffer[] = [];
  private size = 0;

  constructor(private limit: number) {}

  push(chunk: Buffer): void {
    this.chunks.push(chunk);
    this.size += chunk.length;
    while (this.size - this.chunks[0].length >= this.limit) {
      this.size -= this.chunks.shift()!.length;
    }
  }

  toString(): string {
    const all = Buffer.concat(this.chunks);
    return all.subarray(Math.max(0, all.length - this.limit)).toString('utf8');
  }
}

export async function writeRecord(stateDir: string, record: KennelRunRecord): Promise<void> {
  await mkdir(stateDir, { recursive: true });
  const latest = join(stateDir, `${record.label}.json`);
  const tmp = `${latest}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(record, null, 2));
  await rename(tmp, latest);
  await appendFile(join(stateDir, 'history.jsonl'), JSON.stringify(record) + '\n');
}

export interface RunOptions {
  label: string;
  command: string;
  args: string[];
  agent: boolean;
  stateDir?: string;
  stdout?: (chunk: Buffer) => void;
  stderr?: (chunk: Buffer) => void;
}

/** Runs the command, tees its output, records the run. Resolves to the exit code to pass on. */
export async function runWrapped(opts: RunOptions): Promise<number> {
  const stateDir = opts.stateDir ?? RUNS_DIR;
  const started = new Date();
  const record: KennelRunRecord = {
    label: opts.label,
    run_id: randomUUID(),
    kind: opts.agent ? 'agent' : 'scheduled',
    started_at: started.toISOString(),
    finished_at: null,
    status: 'running',
    exit_code: null,
    duration_s: null,
    log_tail: null,
  };
  await writeRecord(stateDir, record);

  const tail = new TailBuffer(TAIL_BYTES);
  const out = opts.stdout ?? (chunk => process.stdout.write(chunk));
  const err = opts.stderr ?? (chunk => process.stderr.write(chunk));

  const exitCode = await new Promise<number>(resolve => {
    const child = spawn(opts.command, opts.args, { stdio: ['inherit', 'pipe', 'pipe'] });
    const forward = (signal: NodeJS.Signals) => () => child.kill(signal);
    const handlers = (['SIGTERM', 'SIGINT', 'SIGHUP'] as const).map(s => [s, forward(s)] as const);
    for (const [signal, handler] of handlers) process.on(signal, handler);
    const done = (code: number) => {
      for (const [signal, handler] of handlers) process.off(signal, handler);
      resolve(code);
    };
    child.stdout.on('data', (chunk: Buffer) => { tail.push(chunk); out(chunk); });
    child.stderr.on('data', (chunk: Buffer) => { tail.push(chunk); err(chunk); });
    child.on('error', error => {
      tail.push(Buffer.from(`kennel-run: could not start ${opts.command}: ${error.message}\n`));
      done(127);
    });
    child.on('close', (code, signal) => {
      done(code ?? 128 + (signal ? osSignal(signal) : 0));
    });
  });

  const finished = new Date();
  await writeRecord(stateDir, {
    ...record,
    finished_at: finished.toISOString(),
    status: exitCode === 0 ? 'ok' : 'failed',
    exit_code: exitCode,
    duration_s: Math.round((finished.getTime() - started.getTime()) / 100) / 10,
    log_tail: tail.toString(),
  });
  return exitCode;
}

function osSignal(signal: NodeJS.Signals): number {
  const numbers: Partial<Record<NodeJS.Signals, number>> = { SIGHUP: 1, SIGINT: 2, SIGKILL: 9, SIGTERM: 15 };
  return numbers[signal] ?? 0;
}

export interface LabelRuns {
  latest: KennelRunRecord;
  recent: RunStatus[];
}

/** Latest record and recent finished statuses per label. */
export async function readRuns(stateDir: string = RUNS_DIR): Promise<Map<string, LabelRuns>> {
  let text: string;
  try {
    text = await readFile(join(stateDir, 'history.jsonl'), 'utf8');
  } catch {
    return new Map();
  }
  const byRun = new Map<string, KennelRunRecord>();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as KennelRunRecord;
      if (record?.label && record.run_id) byRun.set(record.run_id, record);
    } catch {
      // a torn line from a crash mid-append; skip it
    }
  }
  const byLabel = new Map<string, KennelRunRecord[]>();
  for (const record of byRun.values()) {
    byLabel.set(record.label, [...(byLabel.get(record.label) ?? []), record]);
  }
  const result = new Map<string, LabelRuns>();
  for (const [label, records] of byLabel) {
    records.sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at));
    result.set(label, {
      latest: records[records.length - 1],
      recent: records.slice(-RECENT_RUNS).map(r => r.status),
    });
  }
  return result;
}
