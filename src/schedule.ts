// One schedule formatter and the next/previous occurrence math for launchd calendars.

export interface CalendarInterval {
  Minute?: number;
  Hour?: number;
  Day?: number;
  Weekday?: number;
  Month?: number;
}

export interface ScheduleFields {
  StartInterval?: number;
  StartCalendarInterval?: CalendarInterval | CalendarInterval[];
}

// ─── Schedule text ────────────────────────────────────────────────────

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const normWeekday = (d: number) => d % 7; // launchd accepts 0 and 7 for Sunday
const mondayFirst = (d: number) => (d + 6) % 7;

function formatTime(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')}${suffix}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

function timePart(cal: CalendarInterval): string {
  if (cal.Hour !== undefined) return formatTime(cal.Hour, cal.Minute ?? 0);
  if (cal.Minute !== undefined) return `hourly at :${String(cal.Minute).padStart(2, '0')}`;
  return 'every minute';
}

function dayPart(cal: CalendarInterval): string {
  if (cal.Month !== undefined && cal.Day !== undefined) return `${MONTHS[cal.Month - 1] ?? `Month ${cal.Month}`} ${ordinal(cal.Day)}`;
  if (cal.Month !== undefined) return `Daily in ${MONTHS[cal.Month - 1] ?? `month ${cal.Month}`}`;
  if (cal.Day !== undefined) return `Monthly on the ${ordinal(cal.Day)}`;
  if (cal.Weekday !== undefined) return DAY_PLURAL[normWeekday(cal.Weekday)] ?? `Weekday ${cal.Weekday}`;
  return 'Daily';
}

function formatEntry(cal: CalendarInterval): string {
  const time = timePart(cal);
  const day = dayPart(cal);
  if (day === 'Daily' && cal.Hour === undefined) return time.charAt(0).toUpperCase() + time.slice(1);
  return `${day} ${time}`;
}

function weekdaySetLabel(days: number[]): string {
  const set = [...new Set(days.map(normWeekday))].sort((a, b) => mondayFirst(a) - mondayFirst(b));
  const key = set.join(',');
  if (set.length === 7) return 'Daily';
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '6,0') return 'Weekends';
  if (set.length === 1) return DAY_PLURAL[set[0]];
  return set.map(d => DAY_SHORT[d]).join(', ');
}

export function formatSchedule(plist: ScheduleFields): string {
  if (plist.StartCalendarInterval) {
    const entries = Array.isArray(plist.StartCalendarInterval) ? plist.StartCalendarInterval : [plist.StartCalendarInterval];
    // Entries that differ only by weekday collapse into one phrase ("Weekdays 7:15am").
    const groups = new Map<string, CalendarInterval[]>();
    for (const cal of entries) {
      const key = cal.Weekday === undefined
        ? JSON.stringify(cal)
        : JSON.stringify({ ...cal, Weekday: 'w' });
      groups.set(key, [...(groups.get(key) ?? []), cal]);
    }
    const phrases = [...groups.values()].map(group => {
      if (group.length === 1 || group[0].Weekday === undefined) return group.map(formatEntry).join('; ');
      const days = weekdaySetLabel(group.map(c => c.Weekday!));
      return `${days} ${timePart(group[0])}`;
    });
    return phrases.length > 0 ? phrases.join('; ') : 'Every minute';
  }
  if (plist.StartInterval) {
    const secs = plist.StartInterval;
    if (secs % 3600 === 0) return `Every ${secs / 3600}h`;
    if (secs % 60 === 0) return `Every ${secs / 60} min`;
    return `Every ${secs}s`;
  }
  return 'On demand';
}

// ─── Next run ─────────────────────────────────────────────────────────

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const MAX_LOOKAHEAD_DAYS = 366 * 5; // covers a Feb 29 schedule

function dayMatches(cal: CalendarInterval, date: Date): boolean {
  if (cal.Month !== undefined && date.getMonth() + 1 !== cal.Month) return false;
  const dayOk = cal.Day === undefined || date.getDate() === cal.Day;
  const weekdayOk = cal.Weekday === undefined || date.getDay() === normWeekday(cal.Weekday);
  // launchd follows cron: when both day-of-month and weekday are set, either one matches.
  if (cal.Day !== undefined && cal.Weekday !== undefined) return dayOk || weekdayOk;
  return dayOk && weekdayOk;
}

function nextForEntry(cal: CalendarInterval, now: Date): Date | null {
  const hours = cal.Hour !== undefined ? [cal.Hour] : range(24);
  const minutes = cal.Minute !== undefined ? [cal.Minute] : range(60);
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i++) {
    if (dayMatches(cal, day)) {
      for (const h of hours) {
        for (const m of minutes) {
          const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
          if (candidate.getTime() > now.getTime()) return candidate;
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return null;
}

export function nextRun(cal: CalendarInterval | CalendarInterval[] | undefined, now: Date): Date | null {
  if (!cal) return null;
  const entries = Array.isArray(cal) ? cal : [cal];
  let best: Date | null = null;
  for (const entry of entries) {
    const next = nextForEntry(entry, now);
    if (next && (!best || next < best)) best = next;
  }
  return best;
}

function prevForEntry(cal: CalendarInterval, now: Date): Date | null {
  const hours = cal.Hour !== undefined ? [cal.Hour] : range(24);
  const minutes = cal.Minute !== undefined ? [cal.Minute] : range(60);
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i++) {
    if (dayMatches(cal, day)) {
      for (const h of [...hours].reverse()) {
        for (const m of [...minutes].reverse()) {
          const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
          if (candidate.getTime() <= now.getTime()) return candidate;
        }
      }
    }
    day.setDate(day.getDate() - 1);
  }
  return null;
}

/** The latest scheduled occurrence at or before `now`. */
export function prevRun(cal: CalendarInterval | CalendarInterval[] | undefined, now: Date): Date | null {
  if (!cal) return null;
  const entries = Array.isArray(cal) ? cal : [cal];
  let best: Date | null = null;
  for (const entry of entries) {
    const prev = prevForEntry(entry, now);
    if (prev && (!best || prev > best)) best = prev;
  }
  return best;
}
