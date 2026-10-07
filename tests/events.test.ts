import { describe, it, expect } from 'vitest';
import { JobEvents } from '../src/events.js';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('JobEvents', () => {
  it('sends the current list on subscribe, then only changes', async () => {
    const values = [['a'], ['a'], ['a', 'b'], ['a', 'b']];
    let calls = 0;
    const hub = new JobEvents(async () => values[Math.min(calls++, values.length - 1)], { intervalMs: 10 });
    const got: unknown[] = [];
    const unsubscribe = hub.subscribe(jobs => got.push(jobs));
    await wait(80);
    unsubscribe();
    expect(got).toEqual([['a'], ['a', 'b']]);
  });

  it('stops refreshing when nobody is listening', async () => {
    let calls = 0;
    const hub = new JobEvents(async () => { calls++; return []; }, { intervalMs: 10 });
    const unsubscribe = hub.subscribe(() => {});
    await wait(40);
    unsubscribe();
    const after = calls;
    await wait(50);
    expect(calls).toBe(after);
  });

  it('poke refreshes immediately (after an action or a file change)', async () => {
    let n = 0;
    const hub = new JobEvents(async () => [n], { intervalMs: 10_000 });
    const got: unknown[] = [];
    const unsubscribe = hub.subscribe(jobs => got.push(jobs));
    await wait(20);
    n = 1;
    await hub.poke();
    unsubscribe();
    expect(got).toEqual([[0], [1]]);
  });

  it('a loader error keeps the last good list and keeps going', async () => {
    let calls = 0;
    const hub = new JobEvents(async () => { calls++; if (calls === 2) throw new Error('launchctl hiccup'); return [calls > 2 ? 'b' : 'a']; }, { intervalMs: 10 });
    const got: unknown[] = [];
    const unsubscribe = hub.subscribe(jobs => got.push(jobs));
    await wait(60);
    unsubscribe();
    expect(got).toEqual([['a'], ['b']]);
  });
});
