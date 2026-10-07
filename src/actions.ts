import type { ServiceAction } from './types.js';

// Honest launchd actions: choose verbs from the job's current state, then confirm the
// result with launchd before reporting success. Kennel never stops or restarts itself.

export interface LaunchdSnapshot {
  loaded: boolean;
  pid: number | null;
  runs?: number | null;
}

export type Expectation = 'loaded' | 'unloaded' | 'ran';
export type ActionPlan = { steps: string[][]; expect: Expectation } | { refuse: string };

export interface SelfIdentity {
  label: string | undefined;
  pid: number;
}

export function isSelf(label: string, targetPid: number | null, self: SelfIdentity): boolean {
  return (self.label !== undefined && label === self.label) || (targetPid !== null && targetPid === self.pid);
}

export function planLaunchdAction(opts: {
  action: ServiceAction;
  label: string;
  domain: string;
  plistPath: string;
  snapshot: LaunchdSnapshot;
  self: boolean;
}): ActionPlan {
  const { action, label, domain, plistPath, snapshot, self } = opts;
  const target = `${domain}/${label}`;
  if (self && action !== 'start') return { refuse: 'Kennel will not stop or restart itself' };

  if (action === 'start') {
    if (!snapshot.loaded) return { steps: [['bootstrap', domain, plistPath]], expect: 'loaded' };
    if (snapshot.pid) return { refuse: 'Already running' };
    return { steps: [['kickstart', target]], expect: 'ran' };
  }
  if (action === 'stop') {
    if (!snapshot.loaded) return { refuse: 'Already stopped' };
    return { steps: [['bootout', target]], expect: 'unloaded' };
  }
  if (!snapshot.loaded) return { steps: [['bootstrap', domain, plistPath]], expect: 'loaded' };
  return { steps: [['kickstart', '-k', target]], expect: 'ran' };
}

export type Confirmation = { confirmed: true } | { confirmed: false; reason: string };

const REASONS: Record<Expectation, string> = {
  loaded: 'launchd did not load it',
  unloaded: 'launchd still has it loaded',
  ran: 'launchd did not start a new run',
};

function met(expect: Expectation, now: LaunchdSnapshot, before: LaunchdSnapshot | null): boolean {
  if (expect === 'loaded') return now.loaded;
  if (expect === 'unloaded') return !now.loaded;
  if (!before) return now.pid !== null;
  const newPid = now.pid !== null && now.pid !== before.pid;
  const moreRuns = now.runs != null && before.runs != null && now.runs > before.runs;
  return newPid || moreRuns;
}

export async function confirmAction(
  expect: Expectation,
  probe: () => Promise<LaunchdSnapshot>,
  opts: { attempts: number; delayMs: number; before: LaunchdSnapshot | null },
): Promise<Confirmation> {
  for (let i = 0; i < opts.attempts; i++) {
    if (met(expect, await probe(), opts.before)) return { confirmed: true };
    if (i < opts.attempts - 1) await new Promise(r => setTimeout(r, opts.delayMs));
  }
  return { confirmed: false, reason: REASONS[expect] };
}
