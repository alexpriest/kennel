import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  formatSchedule,
  nextRun,
  obsidianUrl,
  parseHistory,
  listScheduledTasks,
  type LaunchctlEntry,
} from '../src/scheduled.js';

// Local-time constructor keeps every assertion independent of the machine's TZ.
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);

describe('formatSchedule', () => {
  it('daily time', () => {
    expect(formatSchedule({ StartCalendarInterval: { Hour: 4, Minute: 55 } })).toBe('Daily 4:55am');
  });

  it('afternoon and midnight/noon', () => {
    expect(formatSchedule({ StartCalendarInterval: { Hour: 13, Minute: 0 } })).toBe('Daily 1:00pm');
    expect(formatSchedule({ StartCalendarInterval: { Hour: 0, Minute: 5 } })).toBe('Daily 12:05am');
    expect(formatSchedule({ StartCalendarInterval: { Hour: 12 } })).toBe('Daily 12:00pm');
  });

  it('single weekday', () => {
    expect(formatSchedule({ StartCalendarInterval: { Weekday: 1, Hour: 9, Minute: 0 } })).toBe('Mondays 9:00am');
    expect(formatSchedule({ StartCalendarInterval: { Weekday: 7, Hour: 18, Minute: 30 } })).toBe('Sundays 6:30pm');
  });

  it('weekdays array collapses to Weekdays', () => {
    const cal = [1, 2, 3, 4, 5].map(Weekday => ({ Weekday, Hour: 7, Minute: 15 }));
    expect(formatSchedule({ StartCalendarInterval: cal })).toBe('Weekdays 7:15am');
  });

  it('several weekdays at one time', () => {
    const cal = [1, 3, 5].map(Weekday => ({ Weekday, Hour: 9, Minute: 0 }));
    expect(formatSchedule({ StartCalendarInterval: cal })).toBe('Mon, Wed, Fri 9:00am');
  });

  it('several times a day', () => {
    const cal = [{ Hour: 8, Minute: 0 }, { Hour: 20, Minute: 0 }];
    expect(formatSchedule({ StartCalendarInterval: cal })).toBe('Daily 8:00am; Daily 8:00pm');
  });

  it('hourly and monthly', () => {
    expect(formatSchedule({ StartCalendarInterval: { Minute: 15 } })).toBe('Hourly at :15');
    expect(formatSchedule({ StartCalendarInterval: { Day: 1, Hour: 6, Minute: 0 } })).toBe('Monthly on the 1st 6:00am');
  });

  it('interval and on-demand', () => {
    expect(formatSchedule({ StartInterval: 1800 })).toBe('Every 30 min');
    expect(formatSchedule({ StartInterval: 7200 })).toBe('Every 2h');
    expect(formatSchedule({})).toBe('On demand');
  });
});

describe('nextRun', () => {
  it('later today', () => {
    expect(nextRun({ Hour: 13, Minute: 0 }, at(2026, 10, 5, 9, 0))).toEqual(at(2026, 10, 5, 13, 0));
  });

  it('rolls to tomorrow once the time has passed', () => {
    expect(nextRun({ Hour: 4, Minute: 55 }, at(2026, 10, 5, 9, 0))).toEqual(at(2026, 10, 6, 4, 55));
  });

  it('exactly at the scheduled minute means the next occurrence', () => {
    expect(nextRun({ Hour: 9, Minute: 0 }, at(2026, 10, 5, 9, 0))).toEqual(at(2026, 10, 6, 9, 0));
  });

  it('next matching weekday (2026-10-05 is a Monday)', () => {
    expect(nextRun({ Weekday: 1, Hour: 9, Minute: 0 }, at(2026, 10, 5, 10, 0))).toEqual(at(2026, 10, 12, 9, 0));
    expect(nextRun({ Weekday: 1, Hour: 9, Minute: 0 }, at(2026, 10, 5, 8, 0))).toEqual(at(2026, 10, 5, 9, 0));
    expect(nextRun({ Weekday: 0, Hour: 9, Minute: 0 }, at(2026, 10, 5, 8, 0))).toEqual(at(2026, 10, 11, 9, 0));
    expect(nextRun({ Weekday: 7, Hour: 9, Minute: 0 }, at(2026, 10, 5, 8, 0))).toEqual(at(2026, 10, 11, 9, 0));
  });

  it('earliest across an array', () => {
    const cal = [{ Weekday: 5, Hour: 9, Minute: 0 }, { Weekday: 3, Hour: 9, Minute: 0 }];
    expect(nextRun(cal, at(2026, 10, 5, 10, 0))).toEqual(at(2026, 10, 7, 9, 0));
  });

  it('hourly with only a minute', () => {
    expect(nextRun({ Minute: 15 }, at(2026, 10, 5, 10, 20))).toEqual(at(2026, 10, 5, 11, 15));
  });

  it('monthly day', () => {
    expect(nextRun({ Day: 1, Hour: 6, Minute: 0 }, at(2026, 10, 5, 10, 0))).toEqual(at(2026, 11, 1, 6, 0));
  });

  it('null without a calendar', () => {
    expect(nextRun(undefined, at(2026, 10, 5))).toBeNull();
  });
});

describe('obsidianUrl', () => {
  it('encodes the vault-relative path without .md, parens included', () => {
    expect(obsidianUrl('/v/Claude/System/Scheduled Tasks/Daily (AM) Briefing.md', '/v'))
      .toBe('obsidian://open?vault=alexpriest&file=Claude%2FSystem%2FScheduled%20Tasks%2FDaily%20%28AM%29%20Briefing');
  });

  it('null outside the vault', () => {
    expect(obsidianUrl('/elsewhere/x.md', '/v')).toBeNull();
    expect(obsidianUrl(null, '/v')).toBeNull();
  });
});

describe('parseHistory', () => {
  it('keeps the final record per session, skips malformed lines, orders by start', () => {
    const lines = [
      JSON.stringify({ slug: 'a', session_id: '1', started_at: '2026-10-01T05:00:00-05:00', status: 'running' }),
      '{not json',
      JSON.stringify({ slug: 'a', session_id: '1', started_at: '2026-10-01T05:00:00-05:00', status: 'ok' }),
      '',
      JSON.stringify({ slug: 'a', session_id: '2', started_at: '2026-10-02T05:00:00-05:00', status: 'failed' }),
      JSON.stringify({ slug: 'b', session_id: '3', started_at: '2026-10-02T05:00:00-05:00', status: 'running' }),
      JSON.stringify(['not', 'a', 'record']),
    ].join('\n');
    const history = parseHistory(lines);
    expect(history.get('a')!.map(r => r.status)).toEqual(['ok', 'failed']);
    expect(history.get('b')!.map(r => r.status)).toEqual(['running']);
  });
});

describe('listScheduledTasks', () => {
  let root: string;
  let agentsDir: string;
  let stateDir: string;
  let vaultRoot: string;
  let tasksDir: string;
  const now = at(2026, 10, 5, 10, 0);

  const plist = (label: string, args: string[], cal: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${args.map(a => `<string>${a}</string>`).join('')}</array>
<key>StartCalendarInterval</key>${cal}
</dict></plist>`;

  const noLaunchctl = async () => new Map<string, LaunchctlEntry>();

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'kennel-scheduled-'));
    agentsDir = join(root, 'LaunchAgents');
    stateDir = join(root, 'state');
    vaultRoot = join(root, 'vault');
    tasksDir = join(vaultRoot, 'Claude/System/Scheduled Tasks');
    await mkdir(agentsDir, { recursive: true });
    await mkdir(tasksDir, { recursive: true });
    await writeFile(join(agentsDir, 'com.alexpriest.task.daily-briefing.plist'),
      plist('com.alexpriest.task.daily-briefing',
        ['/opt/homebrew/bin/python3.11', '/x/scheduled-tasks/run_task.py', 'Daily Briefing'],
        '<dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>55</integer></dict>'));
    await writeFile(join(agentsDir, 'com.alexpriest.task.weekly-review.plist'),
      plist('com.alexpriest.task.weekly-review',
        ['/opt/homebrew/bin/python3.11', '/x/scheduled-tasks/run_task.py', 'Weekly Review'],
        '<dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>'));
    await writeFile(join(agentsDir, 'com.alexpriest.unrelated.plist'),
      plist('com.alexpriest.unrelated', ['/bin/true'], '<dict><key>Hour</key><integer>1</integer></dict>'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('missing state dir renders every task as never run', async () => {
    const tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: noLaunchctl });
    expect(tasks.map(t => t.name)).toEqual(['Daily Briefing', 'Weekly Review']);
    const briefing = tasks[0];
    expect(briefing.status).toBe('never run');
    expect(briefing.lastRunStart).toBeNull();
    expect(briefing.recent).toEqual([]);
    expect(briefing.schedule).toBe('Daily 4:55am');
    expect(briefing.nextRun).toBe(at(2026, 10, 6, 4, 55).toISOString());
    expect(tasks[1].schedule).toBe('Mondays 9:00am');
  });

  it('missing LaunchAgents dir returns an empty list', async () => {
    const tasks = await listScheduledTasks({ launchAgentsDir: join(root, 'nope'), stateDir, vaultRoot, tasksDir, now, launchctl: noLaunchctl });
    expect(tasks).toEqual([]);
  });

  it('joins the latest state file and the last 7 runs of history', async () => {
    await mkdir(stateDir, { recursive: true });
    const doc = join(tasksDir, 'Daily Briefing.md');
    await writeFile(doc, '# task');
    const runs = Array.from({ length: 9 }, (_, i) => ({
      task: 'Daily Briefing', slug: 'daily-briefing', doc, session_id: `s${i}`,
      started_at: `2026-09-${String(20 + i).padStart(2, '0')}T04:55:00-05:00`,
      status: i === 8 ? 'failed' : 'ok',
    }));
    const latest = {
      ...runs[8], finished_at: '2026-09-28T05:01:00-05:00', exit_code: 1, duration_s: 360,
      cost_usd: 1.234, result: 'partial', error: 'Traceback (most recent call last):\n  File x\nRuntimeError: Craft API returned 503',
    };
    await writeFile(join(stateDir, 'daily-briefing.json'), JSON.stringify(latest));
    await writeFile(join(stateDir, 'history.jsonl'),
      runs.map(r => JSON.stringify({ ...r, status: 'running' }) + '\n' + JSON.stringify(r)).join('\n') + '\n{garbage\n');

    const tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: noLaunchctl });
    const t = tasks.find(x => x.slug === 'daily-briefing')!;
    expect(t.status).toBe('failed');
    expect(t.lastRunStart).toBe('2026-09-28T04:55:00-05:00');
    expect(t.durationS).toBe(360);
    expect(t.costUsd).toBe(1.234);
    expect(t.error).toBe('RuntimeError: Craft API returned 503');
    expect(t.docUrl).toBe('obsidian://open?vault=alexpriest&file=Claude%2FSystem%2FScheduled%20Tasks%2FDaily%20Briefing');
    expect(t.recent).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'failed']);
  });

  it('a running state is reported as running', async () => {
    await mkdir(stateDir, { recursive: true });
    await writeFile(join(stateDir, 'weekly-review.json'), JSON.stringify({
      task: 'Weekly Review', slug: 'weekly-review', session_id: 'x', started_at: '2026-10-05T09:00:00-05:00', status: 'running',
    }));
    const tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: noLaunchctl });
    expect(tasks.find(x => x.slug === 'weekly-review')!.status).toBe('running');
  });

  it('malformed state file falls back to history, then never run', async () => {
    await mkdir(stateDir, { recursive: true });
    await writeFile(join(stateDir, 'daily-briefing.json'), '{ truncated');
    await writeFile(join(stateDir, 'weekly-review.json'), '');
    await writeFile(join(stateDir, 'history.jsonl'),
      JSON.stringify({ slug: 'daily-briefing', session_id: 'a', started_at: '2026-10-04T04:55:00-05:00', status: 'ok', cost_usd: 0.5 }) + '\n');
    const tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: noLaunchctl });
    const briefing = tasks.find(x => x.slug === 'daily-briefing')!;
    expect(briefing.status).toBe('ok');
    expect(briefing.costUsd).toBe(0.5);
    expect(tasks.find(x => x.slug === 'weekly-review')!.status).toBe('never run');
  });

  it('alice-payroll takes its status from launchd and its run log', async () => {
    const logDir = join(root, 'alice-payroll');
    await mkdir(logDir, { recursive: true });
    const log = join(logDir, 'run.log');
    await writeFile(log, 'starting\nfetching hours\nError: Gusto login expired\n');
    await writeFile(join(tasksDir, 'Alice Payroll.md'), '# payroll');
    await writeFile(join(agentsDir, 'com.alexpriest.alice-payroll.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.alexpriest.alice-payroll</string>
<key>ProgramArguments</key><array><string>/opt/homebrew/bin/python3.11</string><string>/x/alice_payroll.py</string></array>
<key>StandardOutPath</key><string>${log}</string>
<key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
</dict></plist>`);

    const failing = async () => new Map<string, LaunchctlEntry>([['com.alexpriest.alice-payroll', { pid: null, exitCode: 1 }]]);
    let tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: failing });
    let payroll = tasks.find(x => x.label === 'com.alexpriest.alice-payroll')!;
    expect(payroll.name).toBe('Alice Payroll');
    expect(payroll.kind).toBe('script');
    expect(payroll.status).toBe('failed');
    expect(payroll.error).toBe('Error: Gusto login expired');
    expect(payroll.lastRunStart).not.toBeNull();
    expect(payroll.schedule).toBe('Mondays 9:00am');
    expect(payroll.docUrl).toBe('obsidian://open?vault=alexpriest&file=Claude%2FSystem%2FScheduled%20Tasks%2FAlice%20Payroll');

    const running = async () => new Map<string, LaunchctlEntry>([['com.alexpriest.alice-payroll', { pid: 4242, exitCode: 0 }]]);
    tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: running });
    expect(tasks.find(x => x.label === 'com.alexpriest.alice-payroll')!.status).toBe('running');

    await rm(log);
    tasks = await listScheduledTasks({ launchAgentsDir: agentsDir, stateDir, vaultRoot, tasksDir, now, launchctl: noLaunchctl });
    payroll = tasks.find(x => x.label === 'com.alexpriest.alice-payroll')!;
    expect(payroll.status).toBe('never run');
  });
});
