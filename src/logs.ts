import { open, stat } from 'node:fs/promises';

// One log view per job: stdout and stderr merged, stderr lines tagged, live follow.

export type Stream = 'out' | 'err' | 'both';
export interface LogLine { stream: Stream; text: string }
export interface LogPaths { stdout: string | null; stderr: string | null }
export interface LogSource { path: string; stream: Stream }

const TAIL_BYTES_PER_LINE = 512;
const TIMESTAMP = /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/;

export function logSources(paths: LogPaths): LogSource[] {
  if (paths.stdout && paths.stdout === paths.stderr) return [{ path: paths.stdout, stream: 'both' }];
  const sources: LogSource[] = [];
  if (paths.stdout) sources.push({ path: paths.stdout, stream: 'out' });
  if (paths.stderr) sources.push({ path: paths.stderr, stream: 'err' });
  return sources;
}

function timestampOf(text: string): number | null {
  const match = TIMESTAMP.exec(text);
  if (!match) return null;
  const ms = Date.parse(match[1].replace(' ', 'T'));
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Interleave by leading timestamps when every line has one; otherwise keep each stream
 * together, the least recently written file first. Keeps the last `limit` lines.
 */
export function mergeTails(tails: { stream: Stream; lines: string[]; mtimeMs?: number }[], limit: number): LogLine[] {
  const tagged = tails.map(t => t.lines.map(text => ({ stream: t.stream, text })));
  const all = tagged.flat();
  const stamps = all.map(l => timestampOf(l.text));
  if (tails.length > 1 && stamps.every(s => s !== null)) {
    const ordered = all.map((line, i) => ({ line, at: stamps[i]!, i })).sort((a, b) => a.at - b.at || a.i - b.i);
    return ordered.map(o => o.line).slice(-limit);
  }
  const order = tails.map((t, i) => ({ i, mtime: t.mtimeMs ?? 0 })).sort((a, b) => a.mtime - b.mtime);
  return order.flatMap(o => tagged[o.i]).slice(-limit);
}

async function tailLines(path: string, lines: number): Promise<{ lines: string[]; mtimeMs: number } | null> {
  try {
    const handle = await open(path, 'r');
    try {
      const { size, mtimeMs } = await handle.stat();
      const bytes = Math.min(size, lines * TAIL_BYTES_PER_LINE);
      const buffer = Buffer.alloc(bytes);
      await handle.read(buffer, 0, bytes, size - bytes);
      const text = buffer.toString('utf8').split('\n');
      if (bytes < size) text.shift(); // first line is probably cut
      if (text[text.length - 1] === '') text.pop();
      return { lines: text.slice(-lines), mtimeMs };
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

export async function readMergedTail(paths: LogPaths, lines: number): Promise<LogLine[]> {
  const tails = await Promise.all(logSources(paths).map(async source => {
    const tail = await tailLines(source.path, lines);
    return tail ? { stream: source.stream, ...tail } : null;
  }));
  return mergeTails(tails.filter((t): t is NonNullable<typeof t> => t !== null), lines);
}

/** Emits complete new lines as they are appended. Returns a stop function. */
export async function followLogs(
  paths: LogPaths,
  onLines: (lines: LogLine[]) => void,
  opts: { pollMs?: number } = {},
): Promise<() => void> {
  const states = await Promise.all(logSources(paths).map(async source => ({
    source,
    offset: (await stat(source.path).catch(() => null))?.size ?? 0,
    partial: '',
  })));
  let busy = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for (const state of states) {
        const info = await stat(state.source.path).catch(() => null);
        if (!info) continue;
        if (info.size < state.offset) { state.offset = 0; state.partial = ''; }
        if (info.size === state.offset) continue;
        const handle = await open(state.source.path, 'r');
        try {
          const buffer = Buffer.alloc(info.size - state.offset);
          await handle.read(buffer, 0, buffer.length, state.offset);
          state.offset = info.size;
          const pieces = (state.partial + buffer.toString('utf8')).split('\n');
          state.partial = pieces.pop() ?? '';
          if (pieces.length > 0) onLines(pieces.map(text => ({ stream: state.source.stream, text })));
        } finally {
          await handle.close();
        }
      }
    } finally {
      busy = false;
    }
  };

  const timer = setInterval(() => { void tick(); }, opts.pollMs ?? 500);
  return () => clearInterval(timer);
}
