import { describe, it, expect } from 'vitest';
import { parseEtime, parsePsTable, treeStats, parseLaunchctlPrint, parseDisabled, FlapTracker } from '../src/probe.js';

describe('parseEtime', () => {
  it('handles mm:ss, hh:mm:ss and dd-hh:mm:ss', () => {
    expect(parseEtime('00:05')).toBe(5);
    expect(parseEtime('01:02:03')).toBe(3723);
    expect(parseEtime('04-18:50:20')).toBe(4 * 86400 + 18 * 3600 + 50 * 60 + 20);
    expect(parseEtime('garbage')).toBeNull();
  });
});

describe('process tree', () => {
  const table = parsePsTable([
    '    1     0 04-18:50:20  32336',
    '  100     1    01:00:00   1000',
    '  101   100    00:59:00   2000',
    '  102   101    00:30:00   3000',
    '  200     1       00:10    500',
  ].join('\n'));

  it('uptime is the root process age; memory sums the whole tree', () => {
    expect(treeStats(table, 100)).toEqual({ uptimeS: 3600, rssKb: 6000, processes: 3 });
    expect(treeStats(table, 200)).toEqual({ uptimeS: 10, rssKb: 500, processes: 1 });
  });

  it('null for a pid that is gone', () => {
    expect(treeStats(table, 999)).toBeNull();
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
