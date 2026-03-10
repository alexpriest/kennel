import { createAllBackends } from './backends/index.js';
import type { Backend, BackendType, Service, ServiceAction, ServiceStatus } from './types.js';

export class Registry {
  private backends: Backend[];

  constructor(backends?: Backend[]) {
    this.backends = backends ?? createAllBackends();
  }

  async listServices(filters?: { backend?: BackendType; status?: ServiceStatus }): Promise<Service[]> {
    const available = await Promise.all(
      this.backends.map(async b => ({ backend: b, available: await b.isAvailable() }))
    );

    const results = await Promise.all(
      available
        .filter(({ available }) => available)
        .filter(({ backend }) => !filters?.backend || backend.type === filters.backend)
        .map(({ backend }) => backend.list())
    );

    let services = results.flat();

    // deduplicate: brew services create launchd plists, so remove the launchd
    // entry if a brew entry exists for the same underlying service
    const brewNames = new Set(
      services.filter(s => s.backend === 'brew').map(s => `homebrew.mxcl.${s.name}`)
    );
    services = services.filter(s => {
      if (s.backend === 'launchd' && brewNames.has(s.name)) return false;
      return true;
    });

    if (filters?.status) {
      services = services.filter(s => s.status === filters.status);
    }

    return services.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getService(name: string): Promise<Service | null> {
    const services = await this.listServices();
    // try exact match first, then partial
    return services.find(s => s.name === name || s.backendId === name)
      ?? services.find(s => s.name.includes(name))
      ?? null;
  }

  async performAction(name: string, action: ServiceAction): Promise<{ success: boolean; message: string }> {
    const service = await this.getService(name);
    if (!service) return { success: false, message: `Service not found: ${name}` };
    if (!service.manageable) return { success: false, message: `Service ${service.name} is not manageable` };

    const backend = this.backends.find(b => b.type === service.backend);
    if (!backend) return { success: false, message: `Backend ${service.backend} not found` };

    return backend.performAction(service.backendId, action);
  }

  async getLogs(name: string, lines?: number): Promise<string> {
    const service = await this.getService(name);
    if (!service) return `Service not found: ${name}`;

    const backend = this.backends.find(b => b.type === service.backend);
    if (!backend) return `Backend ${service.backend} not found`;

    return backend.getLogs(service.backendId, lines);
  }
}
