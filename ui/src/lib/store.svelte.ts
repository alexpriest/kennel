import { problemOf, type Job } from './model';

// Live job list from /api/events (pushed by the server), plus per-viewer UI state.

const MUTE_KEY = 'kennel-muted';
const MUTE_MS = 864e5;

function readMutes(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(MUTE_KEY) ?? '{}') as Record<string, number>;
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, until]) => until > now));
  } catch {
    return {};
  }
}

class Store {
  jobs = $state<Job[]>([]);
  live = $state(false);
  loaded = $state(false);
  now = $state(new Date());
  muted = $state<Record<string, number>>(readMutes());
  /** Job id -> what we asked for, while launchd catches up. */
  pending = $state<Record<string, string>>({});
  toast = $state<{ text: string; id: number } | null>(null);
  host = $state('');

  private source: EventSource | null = null;

  connect(): void {
    this.source?.close();
    const source = new EventSource('/api/events');
    this.source = source;
    source.addEventListener('jobs', event => {
      this.jobs = JSON.parse((event as MessageEvent).data);
      this.loaded = true;
      this.live = true;
    });
    source.onopen = () => { this.live = true; };
    source.onerror = () => { this.live = false; };
    setInterval(() => { this.now = new Date(); }, 30_000);
    fetch('/api/meta').then(r => r.json()).then(m => { this.host = m.host ?? ''; }).catch(() => {});
  }

  byId(id: string | null): Job | undefined {
    return id ? this.jobs.find(j => j.id === id) : undefined;
  }

  isMuted(id: string): boolean {
    return (this.muted[id] ?? 0) > Date.now();
  }

  problem(job: Job) {
    return this.isMuted(job.id) ? null : problemOf(job);
  }

  get problems(): Job[] {
    return this.jobs.filter(j => this.problem(j));
  }

  mute(id: string): void {
    this.muted = { ...readMutes(), [id]: Date.now() + MUTE_MS };
    try { localStorage.setItem(MUTE_KEY, JSON.stringify(this.muted)); } catch { /* private window */ }
    this.say('Muted for a day');
  }

  say(text: string): void {
    this.toast = { text, id: Date.now() };
  }

  /** Ask launchd, show it as in progress, then report what launchd actually did. */
  async act(job: Job, action: 'start' | 'stop' | 'restart', doing: string): Promise<boolean> {
    this.pending = { ...this.pending, [job.id]: doing };
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: job.id, action }),
      });
      const result = await res.json() as { success: boolean; message: string };
      this.say(result.success ? result.message.replace(job.id, job.name) : `Didn't work: ${result.message.replace(job.id, job.name)}`);
      return result.success;
    } catch {
      this.say(`Couldn't reach Kennel to ${action} ${job.name}`);
      return false;
    } finally {
      const { [job.id]: _, ...rest } = this.pending;
      this.pending = rest;
    }
  }

  /** Rename or re-describe a job; a blank name returns it to its default. */
  async saveMeta(job: Job, meta: { name?: string; purpose?: string }): Promise<boolean> {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
      const result = await res.json() as { success: boolean; message?: string };
      this.say(result.success ? 'Saved' : `Didn't save: ${result.message ?? 'unknown error'}`);
      return result.success;
    } catch {
      this.say(`Couldn't reach Kennel to save`);
      return false;
    }
  }

  async askClaude(job: Job): Promise<void> {
    const logs = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/logs?lines=40`)
      .then(r => r.json()).then((r: { lines: { stream: string; text: string }[] }) => r.lines).catch(() => []);
    const problem = problemOf(job);
    const prompt = [
      `Kennel flagged a background job on this Mac. Find out why and fix it.`,
      ``,
      `Job: ${job.name} (launchd label ${job.id})`,
      job.purpose ? `What it does: ${job.purpose}` : '',
      `Problem: ${problem?.text ?? 'none detected'}`,
      job.configPath ? `Plist: ${job.configPath}` : '',
      job.logPaths.stdout ? `Log: ${job.logPaths.stdout}` : '',
      job.logPaths.stderr && job.logPaths.stderr !== job.logPaths.stdout ? `Error log: ${job.logPaths.stderr}` : '',
      ``,
      `Last log lines:`,
      ...logs.map(l => (l.stream === 'err' ? `[err] ${l.text}` : l.text)),
    ].filter(line => line !== '').join('\n');
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const result = await res.json() as { success: boolean; message?: string; terminal?: string };
      this.say(result.success ? `Opened Claude on ${job.name} in ${result.terminal}` : `Couldn't open Claude. ${result.message ?? 'Unknown error.'}`);
    } catch {
      this.say(`Couldn't reach Kennel to open Claude`);
    }
  }
}

export const store = new Store();
