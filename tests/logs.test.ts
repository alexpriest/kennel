import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeTails, readMergedTail, followLogs, logSources, type LogLine } from '../src/logs.js';

describe('logSources', () => {
  it('one source when stdout and stderr share a file; none when unset', () => {
    expect(logSources({ stdout: '/a.log', stderr: '/a.log' })).toEqual([{ path: '/a.log', stream: 'both' }]);
    expect(logSources({ stdout: '/o.log', stderr: '/e.log' })).toEqual([{ path: '/o.log', stream: 'out' }, { path: '/e.log', stream: 'err' }]);
    expect(logSources({ stdout: null, stderr: '/e.log' })).toEqual([{ path: '/e.log', stream: 'err' }]);
    expect(logSources({ stdout: null, stderr: null })).toEqual([]);
  });
});

describe('mergeTails', () => {
  it('interleaves by leading timestamps when both streams carry them', () => {
    const out = ['2026-10-07T10:00:00Z start', '2026-10-07T10:00:02Z done'];
    const err = ['2026-10-07T10:00:01Z warn'];
    expect(mergeTails([{ stream: 'out', lines: out }, { stream: 'err', lines: err }], 10).map(l => l.text))
      .toEqual(['2026-10-07T10:00:00Z start', '2026-10-07T10:00:01Z warn', '2026-10-07T10:00:02Z done']);
  });

  it('without timestamps keeps each stream together, older file first, and keeps the last N', () => {
    const merged = mergeTails([{ stream: 'out', lines: ['a', 'b'], mtimeMs: 2 }, { stream: 'err', lines: ['x'], mtimeMs: 1 }], 2);
    expect(merged).toEqual<LogLine[]>([{ stream: 'out', text: 'a' }, { stream: 'out', text: 'b' }]);
    const all = mergeTails([{ stream: 'out', lines: ['a', 'b'], mtimeMs: 2 }, { stream: 'err', lines: ['x'], mtimeMs: 1 }], 10);
    expect(all.map(l => `${l.stream}:${l.text}`)).toEqual(['err:x', 'out:a', 'out:b']);
  });
});

describe('files', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'kennel-logs-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  it('readMergedTail reads the last lines of both files and tags stderr', async () => {
    await writeFile(join(dir, 'o.log'), 'one\ntwo\nthree\n');
    await writeFile(join(dir, 'e.log'), 'bad\n');
    const lines = await readMergedTail({ stdout: join(dir, 'o.log'), stderr: join(dir, 'e.log') }, 10);
    expect(lines.filter(l => l.stream === 'err').map(l => l.text)).toEqual(['bad']);
    expect(lines.filter(l => l.stream === 'out').map(l => l.text)).toEqual(['one', 'two', 'three']);
  });

  it('readMergedTail skips missing files', async () => {
    expect(await readMergedTail({ stdout: join(dir, 'nope.log'), stderr: null }, 10)).toEqual([]);
  });

  it('followLogs emits only new lines, in arrival order, across both files', async () => {
    const out = join(dir, 'o.log');
    const err = join(dir, 'e.log');
    await writeFile(out, 'old\n');
    await writeFile(err, '');
    const seen: string[] = [];
    const stop = await followLogs({ stdout: out, stderr: err }, lines => seen.push(...lines.map(l => `${l.stream}:${l.text}`)), { pollMs: 20 });
    await appendFile(out, 'first\n');
    await new Promise(r => setTimeout(r, 120));
    await appendFile(err, 'second\n');
    await new Promise(r => setTimeout(r, 120));
    await appendFile(out, 'partial');
    await new Promise(r => setTimeout(r, 120));
    await appendFile(out, ' line\n');
    await new Promise(r => setTimeout(r, 120));
    stop();
    expect(seen).toEqual(['out:first', 'err:second', 'out:partial line']);
  });

  it('followLogs starts over when a file is truncated', async () => {
    const out = join(dir, 'o.log');
    await writeFile(out, 'a long first line\n');
    const seen: string[] = [];
    const stop = await followLogs({ stdout: out, stderr: null }, lines => seen.push(...lines.map(l => l.text)), { pollMs: 20 });
    await writeFile(out, 'new\n');
    await new Promise(r => setTimeout(r, 150));
    stop();
    expect(seen).toEqual(['new']);
  });
});
