import type { Job } from '../../../src/collect';

// Pure view logic for the Kennel UI. Tested from the root suite (tests/ui-model.test.ts).

export type { Job };
export type Glyph = 'running' | 'down' | 'fail' | 'ok' | 'idle';
export type ProblemKind = 'down' | 'flapping' | 'unhealthy' | 'failed' | 'missed';
export interface Problem { kind: ProblemKind; text: string }

export const DOMAIN_LABELS: Record<string, string> = {
  kit: 'Kit', paloma: 'Paloma', vault: 'Vault and memory', home: 'Home and family', anth: 'Anthimeros', mac: 'Mac',
};
export const DOMAIN_SHORT: Record<string, string> = {
  kit: 'Kit', paloma: 'Paloma', vault: 'Vault', home: 'Home', anth: 'Anthimeros', mac: 'Mac',
};

export function domainShort(domain: string): string {
  return DOMAIN_SHORT[domain] ?? domain.charAt(0).toUpperCase() + domain.slice(1);
}

export function problemOf(job: Job): Problem | null {
  if (!job.own) return null;
  const d = job.daemon;
  if (d) {
    if (d.state === 'down') return { kind: 'down', text: 'Not running.' };
    if (d.state === 'flapping') return { kind: 'flapping', text: `Restarted ${d.restartsInWindow} times in the last 10 minutes.` };
    if (d.state === 'unhealthy') return { kind: 'unhealthy', text: `Running again after a crash (exit ${d.lastExit}).` };
    return null;
  }
  const s = job.scheduled;
  if (!s || s.schedule === 'paused') return null;
  if (s.last === 'failed') {
    const code = s.lastRun?.exitCode;
    return { kind: 'failed', text: code != null ? `Last run exited with code ${code}.` : 'Last run failed.' };
  }
  if (s.timing === 'missed') return { kind: 'missed', text: 'Missed its last scheduled run.' };
  return null;
}

export function glyphOf(job: Job): Glyph {
  if (job.daemon) {
    if (job.daemon.state === 'up') return 'running';
    if (job.daemon.state === 'down') return 'down';
    return 'fail';
  }
  const s = job.scheduled;
  if (!s) return 'idle';
  if (s.last === 'running') return 'running';
  if (s.last === 'failed' || s.timing === 'missed') return 'fail';
  if (s.last === 'ok') return 'ok';
  return 'idle';
}

export function statusText(job: Job): string {
  if (job.daemon) {
    return { up: 'Running', down: 'Down', flapping: 'Restarting over and over', unhealthy: 'Recovering from a crash' }[job.daemon.state];
  }
  const s = job.scheduled;
  if (!s) return 'Unknown';
  if (s.schedule === 'paused') return 'Paused';
  if (s.last === 'running') return 'Running now';
  if (s.last === 'failed') return 'Last run failed';
  if (s.timing === 'missed') return 'Missed a run';
  if (s.last === 'never') return 'Not run yet';
  return 'Healthy';
}

export const KIND_LABELS: Record<Job['kind'], string> = { daemon: 'Daemon', scheduled: 'Scheduled job', agent: 'Agent' };

export function cadenceOf(job: Job): [number, string] {
  if (job.trigger === 'interval' && job.intervalS != null) {
    return job.intervalS < 45 * 60 ? [0, 'Every few minutes'] : [1, 'Every few hours'];
  }
  if (job.trigger === 'watch') return [5, 'When files change'];
  if (job.trigger !== 'calendar') return [6, 'Once or on demand'];
  const s = job.schedule ?? '';
  if (/^Hourly|Every minute/.test(s)) return [1, 'Every few hours'];
  if (/Monthly| [A-Z][a-z]+ \d+(st|nd|rd|th)/.test(s) && !/Daily/.test(s)) return [4, 'Monthly'];
  if (/Daily/.test(s)) return [2, 'Daily'];
  return [3, 'Weekly'];
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface Ran { at: Date; job: Job; ok: boolean; durationS: number | null }
export interface Upcoming { at: Date; job: Job }

export function todayLists(jobs: Job[], now: Date): { ranToday: Ran[]; comingUp: Upcoming[]; frequent: { total: number; healthy: number } } {
  const own = jobs.filter(j => j.own && j.scheduled);
  const frequent = own.filter(j => cadenceOf(j)[0] === 0);
  const ranToday = own
    .filter(j => cadenceOf(j)[0] !== 0 && j.scheduled!.lastRun && sameDay(new Date(j.scheduled!.lastRun.startedAt), now))
    .map(j => ({
      at: new Date(j.scheduled!.lastRun!.startedAt),
      job: j,
      ok: j.scheduled!.last !== 'failed',
      durationS: j.scheduled!.lastRun!.durationS,
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const day = 864e5;
  const comingUp = own
    .filter(j => j.scheduled!.nextRun && j.scheduled!.schedule === 'active')
    .map(j => ({ at: new Date(j.scheduled!.nextRun!), job: j }))
    .filter(u => {
      const ahead = u.at.getTime() - now.getTime();
      return ahead > 0 && (ahead <= day || (u.job.kind === 'agent' && ahead <= 7 * day));
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return {
    ranToday,
    comingUp,
    frequent: { total: frequent.length, healthy: frequent.filter(j => !problemOf(j)).length },
  };
}

// ─── Timeline: hours of the day on one axis, quiet stretches folded ──────

const GAP_H = 2.5;
const PAD_H = 1;
export const FOLD_W = 24;
const MIN_W = 34;

export interface TimelineLayout {
  x: (hour: number) => number;
  segments: { x: number; w: number }[];
  folds: { x: number; w: number; from: number; to: number }[];
}

export function layoutTimeline(eventHours: number[], nowHour: number, width: number): TimelineLayout {
  const marks = [0, nowHour, 24, ...eventHours].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v !== a[i - 1]);
  type Piece = { a: number; b: number; min?: boolean } | { gap: true; from: number; to: number };
  const pieces: Piece[] = [];
  let foldCount = 0;
  let linear = 0;
  for (let i = 0; i < marks.length - 1; i++) {
    const a = marks[i];
    const b = marks[i + 1];
    if (b - a > GAP_H) {
      pieces.push({ a, b: a + PAD_H }, { gap: true, from: a + PAD_H, to: b - PAD_H }, { a: b - PAD_H, b });
      foldCount++;
      linear += 2 * PAD_H;
    } else {
      pieces.push({ a, b, min: a > 0 && b < 24 });
      linear += b - a;
    }
  }
  const avail = width - foldCount * FOLD_W;
  let k = avail / linear;
  for (let it = 0; it < 6; it++) {
    let fixed = 0;
    let flex = 0;
    for (const q of pieces) {
      if ('gap' in q) continue;
      const w = (q.b - q.a) * k;
      if (q.min && w < MIN_W) fixed += MIN_W; else flex += q.b - q.a;
    }
    k = Math.max(1, (avail - fixed) / flex);
  }
  const map: { a: number; b: number; x0: number; k: number }[] = [];
  const segments: TimelineLayout['segments'] = [];
  const folds: TimelineLayout['folds'] = [];
  let x = 0;
  for (const q of pieces) {
    if ('gap' in q) {
      folds.push({ x, w: FOLD_W, from: q.from, to: q.to });
      x += FOLD_W;
      continue;
    }
    let w = (q.b - q.a) * k;
    if (q.min && w < MIN_W) w = MIN_W;
    map.push({ a: q.a, b: q.b, x0: x, k: w / (q.b - q.a) });
    segments.push({ x, w });
    x += w;
  }
  // Minimum widths can add up past the space on a narrow screen; shrink everything to fit.
  const fit = x > width ? width / x : 1;
  const at = (h: number) => {
    for (const m of map) if (h >= m.a && h <= m.b) return (m.x0 + (h - m.a) * m.k) * fit;
    return x * fit;
  };
  return {
    x: at,
    segments: segments.map(seg => ({ x: seg.x * fit, w: seg.w * fit })),
    folds: folds.map(f => ({ ...f, x: f.x * fit, w: f.w * fit })),
  };
}

export function hourOf(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

// ─── Formatting ─────────────────────────────────────────────────────────

export function dur(s: number | null | undefined): string {
  if (s == null) return '';
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  if (s < 600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export function clock(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function hourLabel(h: number): string {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  return `${hr % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${hr >= 12 && hr < 24 ? 'PM' : 'AM'}`;
}

/** "9:00 AM" today, "Fri 4:00 PM" this week, "Oct 30 9:00 AM" further out. */
export function when(isoOrDate: string | Date | null | undefined, now: Date): string {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (sameDay(d, now)) return clock(d);
  const far = Math.abs(d.getTime() - now.getTime()) > 6 * 864e5;
  const day = far
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${day} ${clock(d)}`;
}
