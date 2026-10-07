import { describe, it, expect } from 'vitest';
import {
  detectTrigger,
  jobKind,
  deriveDaemonState,
  deriveScheduledState,
  type RunSummary,
} from '../src/jobs.js';
import { prevRun } from '../src/schedule.js';
import { displayName, domainFor, isOwnLabel, parseInventoryNotes } from '../src/metadata.js';

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const MIN = 60;

describe('detectTrigger', () => {
  it('KeepAlive true is a daemon trigger', () => {
    expect(detectTrigger({ KeepAlive: true })).toBe('keepalive');
  });

  it('KeepAlive with conditions other than SuccessfulExit=false is still a daemon', () => {
    expect(detectTrigger({ KeepAlive: { Crashed: true } })).toBe('keepalive');
    expect(detectTrigger({ KeepAlive: { NetworkState: true } })).toBe('keepalive');
  });

  it('KeepAlive SuccessfulExit=false alone is run-once until it succeeds', () => {
    expect(detectTrigger({ KeepAlive: { SuccessfulExit: false }, RunAtLoad: true })).toBe('once');
  });

  it('KeepAlive false is not a daemon', () => {
    expect(detectTrigger({ KeepAlive: false, StartInterval: 60 })).toBe('interval');
  });

  it('calendar, interval, watch, login, demand', () => {
    expect(detectTrigger({ StartCalendarInterval: { Hour: 5 } })).toBe('calendar');
    expect(detectTrigger({ StartInterval: 300 })).toBe('interval');
    expect(detectTrigger({ WatchPaths: ['/x'] })).toBe('watch');
    expect(detectTrigger({ QueueDirectories: ['/q'] })).toBe('watch');
    expect(detectTrigger({ RunAtLoad: true })).toBe('login');
    expect(detectTrigger({})).toBe('demand');
  });

  it('KeepAlive wins over a schedule', () => {
    expect(detectTrigger({ KeepAlive: true, StartInterval: 60 })).toBe('keepalive');
  });
});

describe('jobKind', () => {
  it('daemons, agents, scheduled', () => {
    expect(jobKind({ KeepAlive: true, ProgramArguments: ['/bin/node', 'x.js'] })).toBe('daemon');
    expect(jobKind({ StartCalendarInterval: { Hour: 5 }, ProgramArguments: ['python3', '/t/run_task.py', 'Daily Briefing'] })).toBe('agent');
    expect(jobKind({ StartCalendarInterval: { Hour: 5 }, ProgramArguments: ['kennel-run', '--agent', 'x', '--', 'claude'] })).toBe('agent');
    expect(jobKind({ StartInterval: 300, ProgramArguments: ['/bin/sh', 'x.sh'] })).toBe('scheduled');
    expect(jobKind({ WatchPaths: ['/x'] })).toBe('scheduled');
  });

  it('a configured override wins (run-once plists that are really long-running daemons)', () => {
    expect(jobKind({ KeepAlive: { SuccessfulExit: false }, RunAtLoad: true }, 'daemon')).toBe('daemon');
  });
});

describe('prevRun', () => {
  it('earlier today', () => {
    expect(prevRun({ Hour: 5, Minute: 0 }, at(2026, 10, 7, 9, 0))).toEqual(at(2026, 10, 7, 5, 0));
  });

  it('yesterday when today has not come yet', () => {
    expect(prevRun({ Hour: 13, Minute: 0 }, at(2026, 10, 7, 9, 0))).toEqual(at(2026, 10, 6, 13, 0));
  });

  it('exactly at the minute counts as due', () => {
    expect(prevRun({ Hour: 9, Minute: 0 }, at(2026, 10, 7, 9, 0))).toEqual(at(2026, 10, 7, 9, 0));
  });

  it('weekday (2026-10-07 is a Wednesday) and latest across an array', () => {
    expect(prevRun({ Weekday: 1, Hour: 9, Minute: 0 }, at(2026, 10, 7, 9, 0))).toEqual(at(2026, 10, 5, 9, 0));
    const cal = [{ Weekday: 1, Hour: 9, Minute: 0 }, { Weekday: 3, Hour: 8, Minute: 0 }];
    expect(prevRun(cal, at(2026, 10, 7, 9, 0))).toEqual(at(2026, 10, 7, 8, 0));
  });

  it('hourly with only a minute', () => {
    expect(prevRun({ Minute: 15 }, at(2026, 10, 7, 10, 20))).toEqual(at(2026, 10, 7, 10, 15));
  });

  it('null without a calendar', () => {
    expect(prevRun(undefined, at(2026, 10, 7))).toBeNull();
  });
});

describe('deriveDaemonState', () => {
  it('up when running', () => {
    expect(deriveDaemonState({ loaded: true, pid: 10, lastExit: 0, uptimeS: 5000, restartsInWindow: 0 })).toBe('up');
  });

  it('down when not loaded or no pid', () => {
    expect(deriveDaemonState({ loaded: false, pid: null, lastExit: null, uptimeS: null, restartsInWindow: 0 })).toBe('down');
    expect(deriveDaemonState({ loaded: true, pid: null, lastExit: 1, uptimeS: null, restartsInWindow: 0 })).toBe('down');
  });

  it('flapping when it restarted three or more times in the window, with or without a pid right now', () => {
    expect(deriveDaemonState({ loaded: true, pid: 10, lastExit: 1, uptimeS: 4, restartsInWindow: 3 })).toBe('flapping');
    expect(deriveDaemonState({ loaded: true, pid: null, lastExit: 1, uptimeS: null, restartsInWindow: 5 })).toBe('flapping');
  });

  it('unhealthy when it is running again after a crash in the last ten minutes', () => {
    expect(deriveDaemonState({ loaded: true, pid: 10, lastExit: 1, uptimeS: 120, restartsInWindow: 1 })).toBe('unhealthy');
  });

  it('a deliberate stop (SIGTERM, SIGINT, SIGHUP) is not a crash; a segfault or abort is', () => {
    const recent = { loaded: true, pid: 10, uptimeS: 60, restartsInWindow: 1 };
    expect(deriveDaemonState({ ...recent, lastExit: -15 })).toBe('up');
    expect(deriveDaemonState({ ...recent, lastExit: -2 })).toBe('up');
    expect(deriveDaemonState({ ...recent, lastExit: -1 })).toBe('up');
    expect(deriveDaemonState({ ...recent, lastExit: -11 })).toBe('unhealthy');
    expect(deriveDaemonState({ ...recent, lastExit: -6 })).toBe('unhealthy');
  });

  it('a crash long ago with a stable process since is up', () => {
    expect(deriveDaemonState({ loaded: true, pid: 10, lastExit: 1, uptimeS: 10 * MIN + 1, restartsInWindow: 0 })).toBe('up');
  });
});

describe('deriveScheduledState', () => {
  const now = at(2026, 10, 7, 9, 0);
  const installed = at(2026, 9, 1);
  const ran = (start: Date, exitCode: number | null = 0, finished = true): RunSummary => ({
    startedAt: start,
    finishedAt: finished ? new Date(start.getTime() + 60_000) : null,
    exitCode,
  });
  const base = {
    loaded: true,
    disabled: false,
    running: false,
    trigger: 'calendar' as const,
    calendar: { Hour: 5, Minute: 0 },
    interval: undefined,
    installedAt: installed,
    now,
    graceS: 30 * MIN,
  };

  it('active and on time after today’s run', () => {
    expect(deriveScheduledState({ ...base, lastRun: ran(at(2026, 10, 7, 5, 0)) }))
      .toEqual({ schedule: 'active', last: 'ok', timing: 'on-time' });
  });

  it('failed when the last run exited non-zero', () => {
    expect(deriveScheduledState({ ...base, lastRun: ran(at(2026, 10, 7, 5, 0), 1) }).last).toBe('failed');
  });

  it('running while the process is alive', () => {
    expect(deriveScheduledState({ ...base, running: true, lastRun: ran(at(2026, 10, 7, 5, 0), null, false) }).last).toBe('running');
  });

  it('missed when the expected run is past the grace window and no run started after it', () => {
    expect(deriveScheduledState({ ...base, lastRun: ran(at(2026, 10, 6, 5, 0)) }).timing).toBe('missed');
  });

  it('not missed while still inside the grace window (Mac waking from sleep)', () => {
    const early = at(2026, 10, 7, 5, 20);
    expect(deriveScheduledState({ ...base, now: early, lastRun: ran(at(2026, 10, 6, 5, 0)) }).timing).toBe('on-time');
  });

  it('never run: missed only if an occurrence came after it was installed', () => {
    expect(deriveScheduledState({ ...base, lastRun: null })).toMatchObject({ last: 'never', timing: 'missed' });
    expect(deriveScheduledState({ ...base, lastRun: null, installedAt: at(2026, 10, 7, 6, 0) }).timing).toBe('on-time');
  });

  it('without a run record, the last exit code from launchd still says ok or failed', () => {
    expect(deriveScheduledState({ ...base, lastRun: undefined, lastExit: 0 })).toMatchObject({ last: 'ok', timing: 'unknown' });
    expect(deriveScheduledState({ ...base, lastRun: undefined, lastExit: 78 })).toMatchObject({ last: 'failed', timing: 'unknown' });
  });

  it('unknown timing when there is no run record source', () => {
    expect(deriveScheduledState({ ...base, lastRun: undefined })).toMatchObject({ last: 'unknown', timing: 'unknown' });
  });

  it('interval jobs miss after two intervals plus grace', () => {
    const interval = { ...base, trigger: 'interval' as const, calendar: undefined, interval: 15 * MIN };
    expect(deriveScheduledState({ ...interval, lastRun: ran(at(2026, 10, 7, 8, 50)) }).timing).toBe('on-time');
    expect(deriveScheduledState({ ...interval, lastRun: ran(at(2026, 10, 7, 7, 0)) }).timing).toBe('missed');
  });

  it('paused when unloaded or disabled, and a paused job cannot miss', () => {
    expect(deriveScheduledState({ ...base, loaded: false, lastRun: ran(at(2026, 10, 1, 5, 0)) }))
      .toEqual({ schedule: 'paused', last: 'ok', timing: 'n/a' });
    expect(deriveScheduledState({ ...base, disabled: true, lastRun: null }).schedule).toBe('paused');
  });

  it('watch, login, demand and once triggers have no timing', () => {
    for (const trigger of ['watch', 'login', 'demand', 'once'] as const) {
      expect(deriveScheduledState({ ...base, trigger, calendar: undefined, lastRun: null }).timing).toBe('n/a');
    }
  });
});

describe('metadata', () => {
  it('display names: alias wins, otherwise the last label segment humanized', () => {
    expect(displayName('com.alexpriest.kit-imessage-rebuild', { 'com.alexpriest.kit-imessage-rebuild': 'Kit rebuild' })).toBe('Kit rebuild');
    expect(displayName('com.alexpriest.task.daily-briefing', {})).toBe('Daily briefing');
    expect(displayName('com.alex.message_filter', {})).toBe('Message filter');
    expect(displayName('cloudflared', {})).toBe('Cloudflared');
  });

  it('domains match glob patterns in order, with a fallback', () => {
    const domains = { kit: ['com.alexpriest.kit-*', 'com.alex.message-filter'], vault: ['com.alexpriest.*-git-backup'] };
    expect(domainFor('com.alexpriest.kit-watch', domains, 'mac')).toBe('kit');
    expect(domainFor('com.alex.message-filter', domains, 'mac')).toBe('kit');
    expect(domainFor('com.alexpriest.vault-git-backup', domains, 'mac')).toBe('vault');
    expect(domainFor('com.adobe.ccx', domains, 'mac')).toBe('mac');
  });

  it('own labels: everything is own when no patterns are configured', () => {
    expect(isOwnLabel('com.adobe.ccx', [])).toBe(true);
    expect(isOwnLabel('com.adobe.ccx', ['com.alexpriest.*'])).toBe(false);
    expect(isOwnLabel('com.alexpriest.kennel', ['com.alexpriest.*'])).toBe(true);
  });

  it('reads purposes from the inventory notes [jobs] table only', () => {
    const toml = `
[jobs]
"com.a.one" = "Does one thing"
"com.a.two" = "Does two"

[tools]
"x" = "not a job"
`;
    expect(parseInventoryNotes(toml)).toEqual({ 'com.a.one': 'Does one thing', 'com.a.two': 'Does two' });
    expect(parseInventoryNotes('not = = toml')).toEqual({});
  });
});
