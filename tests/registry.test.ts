import { describe, it, expect, vi } from 'vitest';
import { Registry } from '../src/registry.js';
import type { Backend, Service } from '../src/types.js';

function mockBackend(type: string, services: Partial<Service>[]): Backend {
  const fullServices: Service[] = services.map(s => ({
    name: s.name ?? 'test',
    backend: type as Service['backend'],
    status: s.status ?? 'running',
    backendId: s.backendId ?? s.name ?? 'test',
    manageable: s.manageable ?? true,
    ...s,
  }));

  return {
    type: type as Backend['type'],
    isAvailable: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue(fullServices),
    getInfo: vi.fn().mockImplementation(async (id: string) =>
      fullServices.find(s => s.backendId === id) ?? null
    ),
    performAction: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    getLogs: vi.fn().mockResolvedValue('log output'),
  };
}

describe('Registry', () => {
  it('lists services from all backends', async () => {
    const registry = new Registry([
      mockBackend('launchd', [{ name: 'my-agent' }]),
      mockBackend('pm2', [{ name: 'my-app' }]),
    ]);

    const services = await registry.listServices();
    expect(services).toHaveLength(2);
    expect(services.map(s => s.name)).toContain('my-agent');
    expect(services.map(s => s.name)).toContain('my-app');
  });

  it('filters by backend', async () => {
    const registry = new Registry([
      mockBackend('launchd', [{ name: 'agent' }]),
      mockBackend('pm2', [{ name: 'app' }]),
    ]);

    const services = await registry.listServices({ backend: 'pm2' });
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('app');
  });

  it('filters by status', async () => {
    const registry = new Registry([
      mockBackend('launchd', [
        { name: 'running-svc', status: 'running' },
        { name: 'stopped-svc', status: 'stopped' },
      ]),
    ]);

    const services = await registry.listServices({ status: 'running' });
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('running-svc');
  });

  it('deduplicates brew services from launchd', async () => {
    const registry = new Registry([
      mockBackend('launchd', [{ name: 'homebrew.mxcl.syncthing' }]),
      mockBackend('brew', [{ name: 'syncthing' }]),
    ]);

    const services = await registry.listServices();
    expect(services).toHaveLength(1);
    expect(services[0].backend).toBe('brew');
  });

  it('finds service by partial name', async () => {
    const registry = new Registry([
      mockBackend('launchd', [{ name: 'com.alexpriest.imessage-attio', backendId: 'com.alexpriest.imessage-attio' }]),
    ]);

    const service = await registry.getService('imessage-attio');
    expect(service).not.toBeNull();
    expect(service!.name).toBe('com.alexpriest.imessage-attio');
  });

  it('skips unavailable backends', async () => {
    const unavailable: Backend = {
      type: 'pm2',
      isAvailable: vi.fn().mockResolvedValue(false),
      list: vi.fn().mockResolvedValue([]),
      getInfo: vi.fn().mockResolvedValue(null),
      performAction: vi.fn().mockResolvedValue({ success: false, message: '' }),
      getLogs: vi.fn().mockResolvedValue(''),
    };

    const registry = new Registry([
      mockBackend('launchd', [{ name: 'agent' }]),
      unavailable,
    ]);

    const services = await registry.listServices();
    expect(services).toHaveLength(1);
    expect(unavailable.list).not.toHaveBeenCalled();
  });

  it('performs actions on the correct backend', async () => {
    const pm2 = mockBackend('pm2', [{ name: 'my-app', backendId: 'my-app' }]);
    const registry = new Registry([
      mockBackend('launchd', [{ name: 'agent' }]),
      pm2,
    ]);

    await registry.performAction('my-app', 'restart');
    expect(pm2.performAction).toHaveBeenCalledWith('my-app', 'restart');
  });
});
