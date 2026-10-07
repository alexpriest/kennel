import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWrapped, readRuns, TailBuffer } from '../src/runs.js';

describe('TailBuffer', () => {
  it('keeps only the last N bytes', () => {
    const tail = new TailBuffer(5);
    tail.push(Buffer.from('abc'));
    tail.push(Buffer.from('defg'));
    expect(tail.toString()).toBe('cdefg');
  });
});

describe('runWrapped + readRuns', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'kennel-runs-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  const silent = { stdout: () => {}, stderr: () => {} };

  it('records a successful run with merged output tail', async () => {
    const code = await runWrapped({
      label: 'com.test.ok', stateDir: dir, agent: false, ...silent,
      command: process.execPath, args: ['-e', 'console.log("out"); console.error("err")'],
    });
    expect(code).toBe(0);
    const latest = JSON.parse(await readFile(join(dir, 'com.test.ok.json'), 'utf8'));
    expect(latest).toMatchObject({ label: 'com.test.ok', status: 'ok', exit_code: 0, kind: 'scheduled' });
    expect(latest.log_tail).toContain('out');
    expect(latest.log_tail).toContain('err');
    expect(typeof latest.duration_s).toBe('number');
  });

  it('records a failure and returns the child exit code', async () => {
    const code = await runWrapped({
      label: 'com.test.bad', stateDir: dir, agent: true, ...silent,
      command: process.execPath, args: ['-e', 'console.error("boom"); process.exit(3)'],
    });
    expect(code).toBe(3);
    const runs = await readRuns(dir);
    const bad = runs.get('com.test.bad')!;
    expect(bad.latest).toMatchObject({ status: 'failed', exit_code: 3, kind: 'agent' });
    expect(bad.recent).toEqual(['failed']);
  });

  it('a command that cannot start is a failed run, exit 127', async () => {
    const code = await runWrapped({
      label: 'com.test.missing', stateDir: dir, agent: false, ...silent,
      command: '/nonexistent/binary', args: [],
    });
    expect(code).toBe(127);
    expect((await readRuns(dir)).get('com.test.missing')!.latest.status).toBe('failed');
  });

  it('history keeps the final record of each run, oldest first', async () => {
    for (const exit of [0, 1, 0]) {
      await runWrapped({ label: 'com.test.h', stateDir: dir, agent: false, ...silent, command: process.execPath, args: ['-e', `process.exit(${exit})`] });
    }
    expect((await readRuns(dir)).get('com.test.h')!.recent).toEqual(['ok', 'failed', 'ok']);
  });

  it('empty when the directory does not exist', async () => {
    expect((await readRuns(join(dir, 'nope'))).size).toBe(0);
  });
});
