import { describe, it, expect } from 'vitest';
import { parsePsTable, treeStats, parseLaunchctlPrint, parseDisabled, FlapTracker } from '../src/probe.js';

describe('process tree', () => {
  const table = parsePsTable([
    '    1     0  32336 Fri Oct  2 14:26:01 2026    ',
    '  100     1   1000 Wed Oct  7 08:00:00 2026',
    '  101   100   2000 Wed Oct  7 08:01:00 2026',
    '  102   101   3000 Wed Oct  7 08:30:00 2026',
    '  200     1    500 Wed Oct  7 08:59:50 2026',
  ].join('\n'));
  const now = new Date(2026, 9, 7, 9, 0, 0);

  it('start time and uptime come from the root process; memory sums the whole tree', () => {
    expect(treeStats(table, 100, now)).toEqual({ startedAt: new Date(2026, 9, 7, 8, 0, 0), uptimeS: 3600, rssKb: 6000, processes: 3 });
    expect(treeStats(table, 200, now)).toMatchObject({ uptimeS: 10, rssKb: 500, processes: 1 });
  });

  it('null for a pid that is gone', () => {
    expect(treeStats(table, 999, now)).toBeNull();
  });
});

describe('parseLaunchctlPrint', () => {
  it('reads the top-level state, runs, pid and last exit, ignoring nested state lines', () => {
    const out = [
      'gui/501/com.x = {',
      '\tactive count = 1',
      '\tstate = running',
      '\truns = 11',
      '\tpid = 21726',
      '\tlast exit code = 0',
      '\tendpoints = {',
      '\t\tstate = active',
      '\t}',
      '}',
    ].join('\n');
    expect(parseLaunchctlPrint(out)).toEqual({ state: 'running', runs: 11, pid: 21726, lastExit: 0 });
  });

  it('missing fields come back null', () => {
    expect(parseLaunchctlPrint('gui/501/com.x = {\n\tstate = not running\n\tlast exit code = (never exited)\n}'))
      .toEqual({ state: 'not running', runs: null, pid: null, lastExit: null });
  });
});

describe('parseDisabled', () => {
  it('returns the labels marked disabled', () => {
    const out = 'disabled services = {\n\t"com.a" => enabled\n\t"com.b" => disabled\n\t"com.c" => true\n}\n';
    expect([...parseDisabled(out)]).toEqual(['com.b', 'com.c']);
  });
});

describe('FlapTracker', () => {
  it('counts launchd runs within the window', () => {
    const t = new FlapTracker(600);
    expect(t.observe('a', 5, 0)).toBe(0);
    expect(t.observe('a', 6, 100_000)).toBe(1);
    expect(t.observe('a', 9, 200_000)).toBe(4);
    // samples older than the window drop out
    expect(t.observe('a', 9, 900_000)).toBe(0);
  });

  it('a reset counter (reloaded job) starts over', () => {
    const t = new FlapTracker(600);
    t.observe('a', 20, 0);
    expect(t.observe('a', 1, 10_000)).toBe(0);
  });
});
