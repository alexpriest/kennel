import { describe, it, expect } from 'vitest';
import { problemOf, glyphOf, cadenceOf, todayLists, layoutTimeline, dur, sameDay } from '../ui/src/lib/model.js';
import type { Job } from '../src/collect.js';

const now = new Date(2026, 9, 7, 9, 0);
const iso = (h: number, m = 0, d = 7) => new Date(2026, 9, d, h, m).toISOString();

function job(over: Partial<Job> & { id: string }): Job {
  return {
    backend: 'launchd', name: over.id, purpose: null, domain: 'kit', own: true, kind: 'scheduled', trigger: 'calendar',
    schedule: 'Daily 5:00am', intervalS: null, pid: null, configPath: null, logPaths: { stdout: null, stderr: null },
    ...over,
  } as Job;
}
const sched = (o: Partial<NonNullable<Job['scheduled']>> = {}): NonNullable<Job['scheduled']> => ({
  schedule: 'active', last: 'ok', timing: 'on-time', nextRun: null, lastRun: null, recent: [], source: 'kennel-run', docUrl: null, ...o,
});
const daemon = (state: 'up' | 'down' | 'flapping' | 'unhealthy') => ({ state, startedAt: null, memoryMb: null, processes: null, restartsInWindow: 0, lastExit: null });

describe('problemOf', () => {
  it('daemon trouble, failed runs and missed runs are problems', () => {
    expect(problemOf(job({ id: 'a', kind: 'daemon', daemon: daemon('down') }))?.kind).toBe('down');
    expect(problemOf(job({ id: 'b', kind: 'daemon', daemon: daemon('flapping') }))?.kind).toBe('flapping');
    expect(problemOf(job({ id: 'c', kind: 'daemon', daemon: daemon('unhealthy') }))?.kind).toBe('unhealthy');
    expect(problemOf(job({ id: 'd', scheduled: sched({ last: 'failed', lastRun: { startedAt: iso(5), finishedAt: iso(5, 1), exitCode: 3, durationS: 4, logTail: null } }) }))).toMatchObject({ kind: 'failed', text: 'Last run exited with code 3.' });
    expect(problemOf(job({ id: 'e', scheduled: sched({ timing: 'missed' }) }))?.kind).toBe('missed');
  });

  it('healthy, paused, and third-party jobs are not', () => {
    expect(problemOf(job({ id: 'a', kind: 'daemon', daemon: daemon('up') }))).toBeNull();
    expect(problemOf(job({ id: 'b', scheduled: sched({ schedule: 'paused', last: 'failed' }) }))).toBeNull();
    expect(problemOf(job({ id: 'c', own: false, kind: 'daemon', daemon: daemon('down') }))).toBeNull();
  });
});

describe('glyphOf', () => {
  it('maps state to one glyph', () => {
    expect(glyphOf(job({ id: 'a', kind: 'daemon', daemon: daemon('up') }))).toBe('running');
    expect(glyphOf(job({ id: 'b', kind: 'daemon', daemon: daemon('down') }))).toBe('down');
    expect(glyphOf(job({ id: 'c', scheduled: sched({ last: 'failed' }) }))).toBe('fail');
    expect(glyphOf(job({ id: 'd', scheduled: sched({ last: 'running' }) }))).toBe('running');
    expect(glyphOf(job({ id: 'e', scheduled: sched({ last: 'never' }) }))).toBe('idle');
    expect(glyphOf(job({ id: 'f', scheduled: sched({ last: 'ok' }) }))).toBe('ok');
  });
});

describe('cadenceOf', () => {
  it('groups by how often a job runs', () => {
    expect(cadenceOf(job({ id: 'a', trigger: 'interval', intervalS: 300 }))).toEqual([0, 'Every few minutes']);
    expect(cadenceOf(job({ id: 'b', trigger: 'interval', intervalS: 3600 }))).toEqual([1, 'Every few hours']);
    expect(cadenceOf(job({ id: 'c', schedule: 'Daily 5:00am' }))).toEqual([2, 'Daily']);
    expect(cadenceOf(job({ id: 'c2', schedule: 'Daily 8:00am; Daily 8:00pm' }))).toEqual([2, 'Daily']);
    expect(cadenceOf(job({ id: 'd', schedule: 'Fridays 7:10am' }))).toEqual([3, 'Weekly']);
    expect(cadenceOf(job({ id: 'd2', schedule: 'Weekdays 7:15am' }))).toEqual([3, 'Weekly']);
    expect(cadenceOf(job({ id: 'e', schedule: 'Monthly on the 1st 7:30am' }))).toEqual([4, 'Monthly']);
    expect(cadenceOf(job({ id: 'f', trigger: 'watch', schedule: 'When files change' }))).toEqual([5, 'When files change']);
    expect(cadenceOf(job({ id: 'g', trigger: 'once', schedule: 'Once, until it succeeds' }))).toEqual([6, 'Once or on demand']);
  });
});

describe('todayLists', () => {
  const ran = (id: string, h: number, exitCode = 0, d = 7) => job({
    id, scheduled: sched({ last: exitCode ? 'failed' : 'ok', lastRun: { startedAt: iso(h, 0, d), finishedAt: iso(h, 1, d), exitCode, durationS: 60, logTail: null } }),
  });
  const jobs = [
    ran('early', 3), ran('late', 5, 1), ran('yesterday', 22, 0, 6),
    job({ id: 'frequent', trigger: 'interval', intervalS: 300, scheduled: sched({ lastRun: { startedAt: iso(8, 55), finishedAt: null, exitCode: 0, durationS: 1, logTail: null } }) }),
    job({ id: 'soon', scheduled: sched({ nextRun: iso(13) }) }),
    job({ id: 'tomorrow', scheduled: sched({ nextRun: iso(4, 55, 8) }) }),
    job({ id: 'nextweek', kind: 'agent', scheduled: sched({ nextRun: iso(9, 0, 11) }) }),
    job({ id: 'farjob', scheduled: sched({ nextRun: iso(9, 0, 30) }) }),
    job({ id: 'theirs', own: false, scheduled: sched({ nextRun: iso(10) }) }),
  ];

  it('ran today: own non-frequent jobs that started today, in time order', () => {
    expect(todayLists(jobs, now).ranToday.map(r => [r.job.id, r.ok])).toEqual([['early', true], ['late', false]]);
  });

  it('coming up: the next 24 hours, plus agents within a week', () => {
    expect(todayLists(jobs, now).comingUp.map(r => r.job.id)).toEqual(['soon', 'tomorrow', 'nextweek']);
  });

  it('counts frequent jobs and how many are healthy', () => {
    expect(todayLists(jobs, now).frequent).toEqual({ total: 1, healthy: 1 });
  });
});

describe('layoutTimeline', () => {
  it('folds quiet stretches, keeps events in order, and stays inside the width', () => {
    const t = layoutTimeline([3.5, 5, 5.1667, 13, 21], 7.4, 600);
    expect(t.folds.length).toBeGreaterThan(0);
    const xs = [3.5, 5, 5.1667, 7.4, 13, 21].map(t.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    expect(t.x(0)).toBe(0);
    expect(t.x(24)).toBeLessThanOrEqual(600.5);
  });

  it('never runs past the available width, even crowded on a phone', () => {
    const t = layoutTimeline([0.5, 3.5, 4.9, 5, 5.1, 9.7, 9.72, 9.75, 9.8, 9.85, 13, 17.25, 21], 9.9, 300);
    expect(t.x(24)).toBeLessThanOrEqual(300.5);
    const folds = t.folds.at(-1)!;
    expect(folds.x + folds.w).toBeLessThanOrEqual(300.5);
  });

  it('close events keep a minimum gap so their dots do not overlap', () => {
    const t = layoutTimeline([5, 5.1667], 9, 600);
    expect(t.x(5.1667) - t.x(5)).toBeGreaterThanOrEqual(12);
  });
});

describe('small formatters', () => {
  it('dur and sameDay', () => {
    expect(dur(53)).toBe('53s');
    expect(dur(159)).toBe('2m 39s');
    expect(dur(413524)).toBe('4d 18h');
    expect(dur(null)).toBe('');
    expect(sameDay(new Date(iso(1)), now)).toBe(true);
    expect(sameDay(new Date(iso(23, 0, 6)), now)).toBe(false);
  });
});
