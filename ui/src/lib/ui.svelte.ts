import type { Job } from './model';

// Navigation and filter state shared across components.

export const VIEWS = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'daemons', label: 'Daemons', icon: 'daemons', kind: 'daemon' },
  { id: 'scheduled', label: 'Scheduled', icon: 'scheduled', kind: 'scheduled' },
  { id: 'agents', label: 'Agents', icon: 'agents', kind: 'agent' },
  { id: 'hidden', label: 'Mac and third-party', icon: 'hidden', kind: 'hidden' },
] as const;
export type ViewId = (typeof VIEWS)[number]['id'];

class Ui {
  view = $state<ViewId>('today');
  domains = $state<string[]>([]);
  open = $state<string | null>(null);
  search = $state('');
  help = $state(false);

  inDomain(job: Job): boolean {
    return this.domains.length === 0 || this.domains.includes(job.domain);
  }

  toggleDomain(domain: string): void {
    this.domains = this.domains.includes(domain) ? this.domains.filter(d => d !== domain) : [...this.domains, domain];
  }

  matches(job: Job): boolean {
    const q = this.search.trim().toLowerCase();
    if (!q) return true;
    return [job.name, job.id, job.purpose ?? '', job.domain].some(s => s.toLowerCase().includes(q));
  }
}

export const ui = new Ui();

/** Jobs a view shows: own jobs of that kind, or everything not ours for "hidden". */
export function jobsFor(view: ViewId, jobs: Job[]): Job[] {
  const v = VIEWS.find(x => x.id === view);
  if (!v || !('kind' in v)) return jobs.filter(j => j.own);
  if (v.kind === 'hidden') return jobs.filter(j => !j.own);
  return jobs.filter(j => j.own && j.kind === v.kind);
}
