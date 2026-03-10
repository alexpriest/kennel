import { describe, it, expect, vi } from 'vitest';
import { runDoctor } from '../src/doctor.js';
import { Registry } from '../src/registry.js';
import type { Service } from '../src/types.js';

function makeRegistry(services: Partial<Service>[]): Registry {
  const fullServices: Service[] = services.map(s => ({
    name: s.name ?? 'test',
    backend: s.backend ?? 'launchd',
    status: s.status ?? 'running',
    backendId: s.backendId ?? s.name ?? 'test',
    manageable: s.manageable ?? true,
    ...s,
  }));

  const registry = new Registry([]);
  vi.spyOn(registry, 'listServices').mockResolvedValue(fullServices);
  return registry;
}

describe('Doctor', () => {
  it('reports error state services', async () => {
    const registry = makeRegistry([
      { name: 'broken-svc', status: 'error', exitCode: 1 },
    ]);

    const issues = await runDoctor(registry);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('error state');
  });

  it('returns no issues for healthy services', async () => {
    const registry = makeRegistry([
      { name: 'healthy', status: 'running', pid: process.pid, backend: 'pm2' },
    ]);

    const issues = await runDoctor(registry);
    expect(issues).toHaveLength(0);
  });
});
