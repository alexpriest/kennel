import { execFile } from 'node:child_process';
import { copyFile, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { readLaunchctlPrint } from './probe.js';
import { readRuns, writeRecord, RUNS_DIR, type KennelRunRecord } from './runs.js';
import { stat } from 'node:fs/promises';

// `kennel wrap`: route a LaunchAgent through kennel-run so every run is recorded.
// Reversible with `kennel unwrap`; the original plist is backed up before the first wrap.

const execFileAsync = promisify(execFile);
const LAUNCHER_APP = /\.app\/Contents\/MacOS\//;
export const BACKUP_DIR = join(homedir(), '.local', 'state', 'kennel', 'plist-backups');

export interface Runner { node: string; script: string }

const runnerIndex = (args: string[]) => args.findIndex(a => basename(a) === 'kennel-run.js' || basename(a) === 'kennel-run');

export function isWrapped(args: string[]): boolean {
  return runnerIndex(args) >= 0;
}

export function wrapArgs(args: string[], opts: Runner & { label: string; agent: boolean }): string[] {
  if (isWrapped(args)) return args;
  // A permission launcher app must stay first: macOS attributes the job's permissions to it.
  const keep = args.length > 0 && LAUNCHER_APP.test(args[0]) ? 1 : 0;
  const runner = [opts.node, opts.script, ...(opts.agent ? ['--agent'] : []), '--label', opts.label, '--'];
  return [...args.slice(0, keep), ...runner, ...args.slice(keep)];
}

export function unwrapArgs(args: string[]): string[] {
  const at = runnerIndex(args);
  if (at < 0) return args;
  const separator = args.indexOf('--', at);
  const start = args[at - 1] && basename(args[at - 1]).startsWith('node') ? at - 1 : at;
  return [...args.slice(0, start), ...args.slice(separator + 1)];
}

/** A versioned Cellar path breaks on `brew upgrade node`; use the node on PATH when there is one. */
export async function stableNode(
  execPath: string,
  pathEnv: string,
  exists: (path: string) => Promise<boolean> = p => access(p).then(() => true, () => false),
): Promise<string> {
  if (!execPath.includes('/Cellar/')) return execPath;
  for (const dir of pathEnv.split(':').filter(Boolean)) {
    const candidate = join(dir, 'node');
    if (await exists(candidate)) return candidate;
  }
  return execPath;
}

export async function defaultRunner(): Promise<Runner> {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return { node: await stableNode(process.execPath, process.env.PATH ?? ''), script: resolve(here, 'kennel-run.js') };
}

async function readArgs(path: string): Promise<string[]> {
  const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', path]);
  const plist = JSON.parse(stdout);
  return plist.ProgramArguments ?? (plist.Program ? [plist.Program] : []);
}

/** launchd forgets a job's last exit on reload, so keep it as the first history entry. */
export function seedRecord(label: string, lastExit: number | null, at: Date): KennelRunRecord | null {
  if (lastExit === null) return null;
  return {
    label,
    run_id: `seed-${label}`,
    kind: 'scheduled',
    started_at: at.toISOString(),
    finished_at: at.toISOString(),
    status: lastExit === 0 ? 'ok' : 'failed',
    exit_code: lastExit,
    duration_s: null,
    log_tail: null,
    seeded: true,
  };
}

async function logMtime(plistPath: string): Promise<Date | null> {
  const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', plistPath]);
  const plist = JSON.parse(stdout);
  for (const path of [plist.StandardErrorPath, plist.StandardOutPath]) {
    if (!path) continue;
    const info = await stat(path).catch(() => null);
    if (info) return info.mtime;
  }
  return null;
}

export type WrapOutcome = 'wrapped' | 'unwrapped' | 'unchanged' | 'running' | 'failed';

/** Rewrites ProgramArguments and reloads the job if launchd had it loaded. Never interrupts a run. */
export async function applyWrap(
  label: string,
  plistPath: string,
  mode: 'wrap' | 'unwrap',
  opts: { agent: boolean; runner?: Runner },
): Promise<{ outcome: WrapOutcome; message: string }> {
  const uid = process.getuid?.() ?? 501;
  const domain = `gui/${uid}`;
  try {
    const args = await readArgs(plistPath);
    const next = mode === 'wrap'
      ? wrapArgs(args, { ...(opts.runner ?? await defaultRunner()), label, agent: opts.agent })
      : unwrapArgs(args);
    if (JSON.stringify(next) === JSON.stringify(args)) return { outcome: 'unchanged', message: `${label}: already ${mode}ped` };

    const before = await readLaunchctlPrint(domain, label);
    if (before?.pid) return { outcome: 'running', message: `${label}: running right now, try again after it finishes` };

    await mkdir(BACKUP_DIR, { recursive: true });
    const backup = join(BACKUP_DIR, `${label}.plist`);
    if (mode === 'wrap' && !(await access(backup).then(() => true, () => false))) await copyFile(plistPath, backup);

    if (mode === 'wrap' && before && !(await readRuns()).has(label)) {
      const at = await logMtime(plistPath);
      const seed = at ? seedRecord(label, before.lastExit, at) : null;
      if (seed) await writeRecord(RUNS_DIR, { ...seed, kind: opts.agent ? 'agent' : 'scheduled' });
    }

    await execFileAsync('plutil', ['-replace', 'ProgramArguments', '-json', JSON.stringify(next), plistPath]);
    await execFileAsync('plutil', ['-lint', plistPath]);
    if (before) {
      await execFileAsync('launchctl', ['bootout', `${domain}/${label}`]);
      await execFileAsync('launchctl', ['bootstrap', domain, plistPath]);
      const after = await readLaunchctlPrint(domain, label);
      if (!after) return { outcome: 'failed', message: `${label}: rewritten but launchd did not reload it (backup: ${backup})` };
    }
    return { outcome: mode === 'wrap' ? 'wrapped' : 'unwrapped', message: `${label}: ${mode}ped${before ? ' and reloaded' : ' (not loaded, left unloaded)'}` };
  } catch (err: unknown) {
    return { outcome: 'failed', message: `${label}: ${err instanceof Error ? err.message : String(err)}` };
  }
}
