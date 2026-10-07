import { describe, it, expect } from 'vitest';
import { wrapArgs, unwrapArgs, isWrapped } from '../src/wrap.js';

const runner = { node: '/opt/homebrew/bin/node', script: '/k/dist/kennel-run.js' };

describe('wrapArgs', () => {
  it('prefixes a plain command and always passes the label', () => {
    expect(wrapArgs(['/bin/bash', '/x.sh'], { ...runner, label: 'com.a.x', agent: false }))
      .toEqual(['/opt/homebrew/bin/node', '/k/dist/kennel-run.js', '--label', 'com.a.x', '--', '/bin/bash', '/x.sh']);
  });

  it('goes after a permission launcher app so the job keeps its macOS permissions', () => {
    const launcher = '/Users/a/Library/Application Support/Agent Tools/Sync.app/Contents/MacOS/launcher';
    expect(wrapArgs([launcher, '/usr/bin/uv', 'run', 'x'], { ...runner, label: 'com.a.y', agent: false }))
      .toEqual([launcher, '/opt/homebrew/bin/node', '/k/dist/kennel-run.js', '--label', 'com.a.y', '--', '/usr/bin/uv', 'run', 'x']);
  });

  it('adds --agent for agent jobs', () => {
    expect(wrapArgs(['claude'], { ...runner, label: 'l', agent: true }).slice(2, 6)).toEqual(['--agent', '--label', 'l', '--']);
  });

  it('is idempotent', () => {
    const once = wrapArgs(['/bin/sh', '-c', 'x'], { ...runner, label: 'l', agent: false });
    expect(wrapArgs(once, { ...runner, label: 'l', agent: false })).toEqual(once);
    expect(isWrapped(once)).toBe(true);
    expect(isWrapped(['/bin/sh'])).toBe(false);
  });
});

describe('unwrapArgs', () => {
  it('restores the original arguments, launcher included', () => {
    const launcher = '/A/Sync.app/Contents/MacOS/launcher';
    for (const original of [['/bin/bash', '/x.sh'], [launcher, '/usr/bin/uv', 'run']]) {
      const wrapped = wrapArgs(original, { ...runner, label: 'l', agent: true });
      expect(unwrapArgs(wrapped)).toEqual(original);
    }
  });

  it('leaves unwrapped arguments alone', () => {
    expect(unwrapArgs(['/bin/sh', 'x'])).toEqual(['/bin/sh', 'x']);
  });
});

describe('stableNode', () => {
  it('prefers a node on PATH over a versioned Homebrew Cellar path', async () => {
    const { stableNode } = await import('../src/wrap.js');
    const exists = async (p: string) => p === '/opt/homebrew/bin/node';
    expect(await stableNode('/opt/homebrew/Cellar/node/25.6.1/bin/node', '/usr/bin:/opt/homebrew/bin', exists)).toBe('/opt/homebrew/bin/node');
    expect(await stableNode('/usr/local/bin/node', '/usr/bin', exists)).toBe('/usr/local/bin/node');
    expect(await stableNode('/opt/homebrew/Cellar/node/25.6.1/bin/node', '/usr/bin', exists)).toBe('/opt/homebrew/Cellar/node/25.6.1/bin/node');
  });
});

describe('seedRecord', () => {
  it('carries launchd\'s last exit into run history, marked as seeded', async () => {
    const { seedRecord } = await import('../src/wrap.js');
    const at = new Date('2026-10-07T10:10:09Z');
    expect(seedRecord('com.a.x', 1, at)).toMatchObject({
      label: 'com.a.x', status: 'failed', exit_code: 1, started_at: at.toISOString(), finished_at: at.toISOString(), seeded: true, duration_s: null,
    });
    expect(seedRecord('com.a.x', 0, at)?.status).toBe('ok');
    expect(seedRecord('com.a.x', null, at)).toBeNull();
  });
});
