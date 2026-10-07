import { describe, it, expect } from 'vitest';
import { planLaunchdAction, confirmAction, isSelf, type LaunchdSnapshot } from '../src/actions.js';

const D = 'gui/501';
const PLIST = '/L/com.x.plist';

describe('isSelf', () => {
  it('matches our own launchd label or our own pid', () => {
    expect(isSelf('com.alexpriest.kennel', null, { label: 'com.alexpriest.kennel', pid: 1 })).toBe(true);
    expect(isSelf('com.other', 1, { label: 'com.alexpriest.kennel', pid: 1 })).toBe(true);
    expect(isSelf('com.other', 2, { label: 'com.alexpriest.kennel', pid: 1 })).toBe(false);
    expect(isSelf('com.other', null, { label: undefined, pid: 1 })).toBe(false);
  });
});

describe('planLaunchdAction', () => {
  const loadedIdle: LaunchdSnapshot = { loaded: true, pid: null };
  const loadedRunning: LaunchdSnapshot = { loaded: true, pid: 42 };
  const unloaded: LaunchdSnapshot = { loaded: false, pid: null };
  const plan = (action: 'start' | 'stop' | 'restart', snap: LaunchdSnapshot, self = false) =>
    planLaunchdAction({ action, label: 'com.x', domain: D, plistPath: PLIST, snapshot: snap, self });

  it('refuses to stop or restart Kennel itself', () => {
    expect(plan('stop', loadedRunning, true)).toEqual({ refuse: 'Kennel will not stop or restart itself' });
    expect(plan('restart', loadedRunning, true)).toEqual({ refuse: 'Kennel will not stop or restart itself' });
  });

  it('start: bootstrap when unloaded, kickstart (run now) when loaded and idle, nothing when running', () => {
    expect(plan('start', unloaded)).toEqual({ steps: [['bootstrap', D, PLIST]], expect: 'loaded' });
    expect(plan('start', loadedIdle)).toEqual({ steps: [['kickstart', `${D}/com.x`]], expect: 'ran' });
    expect(plan('start', loadedRunning)).toEqual({ refuse: 'Already running' });
  });

  it('stop: bootout when loaded, nothing when already unloaded', () => {
    expect(plan('stop', loadedRunning)).toEqual({ steps: [['bootout', `${D}/com.x`]], expect: 'unloaded' });
    expect(plan('stop', unloaded)).toEqual({ refuse: 'Already stopped' });
  });

  it('restart: kickstart -k when loaded, bootstrap when unloaded', () => {
    expect(plan('restart', loadedRunning)).toEqual({ steps: [['kickstart', '-k', `${D}/com.x`]], expect: 'ran' });
    expect(plan('restart', unloaded)).toEqual({ steps: [['bootstrap', D, PLIST]], expect: 'loaded' });
  });
});

describe('confirmAction', () => {
  const seq = (snaps: (LaunchdSnapshot & { runs?: number | null })[]) => {
    let i = 0;
    return async () => snaps[Math.min(i++, snaps.length - 1)];
  };
  const fast = { attempts: 5, delayMs: 0 };

  it('loaded: waits until launchd reports the job', async () => {
    expect(await confirmAction('loaded', seq([{ loaded: false, pid: null }, { loaded: true, pid: 7 }]), { ...fast, before: null }))
      .toEqual({ confirmed: true });
  });

  it('unloaded: fails with a reason if it is still there', async () => {
    expect(await confirmAction('unloaded', seq([{ loaded: true, pid: 7 }]), { ...fast, before: null }))
      .toEqual({ confirmed: false, reason: 'launchd still has it loaded' });
  });

  it('ran: a new pid or a higher run counter counts', async () => {
    expect(await confirmAction('ran', seq([{ loaded: true, pid: 9, runs: 4 }]), { ...fast, before: { loaded: true, pid: 8, runs: 3 } }))
      .toEqual({ confirmed: true });
    expect(await confirmAction('ran', seq([{ loaded: true, pid: null, runs: 4 }]), { ...fast, before: { loaded: true, pid: null, runs: 3 } }))
      .toEqual({ confirmed: true });
    expect(await confirmAction('ran', seq([{ loaded: true, pid: 8, runs: 3 }]), { ...fast, before: { loaded: true, pid: 8, runs: 3 } }))
      .toEqual({ confirmed: false, reason: 'launchd did not start a new run' });
  });
});
