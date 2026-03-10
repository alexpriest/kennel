import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Backend, Service, ServiceAction } from '../types.js';

const execFileAsync = promisify(execFile);

interface BrewServiceInfo {
  name: string;
  status: string | null;
  user: string | null;
  file: string | null;
  exit_code: number | null;
  pid?: number | null;
  log_path?: string | null;
  error_log_path?: string | null;
}

export class BrewBackend implements Backend {
  type = 'brew' as const;

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync('brew', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<Service[]> {
    if (!(await this.isAvailable())) return [];

    try {
      const { stdout } = await execFileAsync('brew', ['services', 'list', '--json']);
      const services: BrewServiceInfo[] = JSON.parse(stdout);

      return services.map(svc => ({
        name: svc.name,
        backend: 'brew' as const,
        status: svc.status === 'started' ? 'running' as const
          : svc.status === 'error' ? 'error' as const
          : 'stopped' as const,
        pid: svc.pid ?? undefined,
        enabled: svc.status === 'started',
        configPath: svc.file ?? undefined,
        logPaths: {
          stdout: svc.log_path ?? undefined,
          stderr: svc.error_log_path ?? undefined,
        },
        exitCode: svc.exit_code ?? undefined,
        backendId: svc.name,
        manageable: true,
      }));
    } catch {
      // fallback to non-json parsing
      return this.listFallback();
    }
  }

  private async listFallback(): Promise<Service[]> {
    try {
      const { stdout } = await execFileAsync('brew', ['services', 'list']);
      const lines = stdout.trim().split('\n').slice(1); // skip header
      return lines.map(line => {
        const parts = line.split(/\s+/);
        const name = parts[0];
        const statusStr = parts[1];
        return {
          name,
          backend: 'brew' as const,
          status: statusStr === 'started' ? 'running' as const
            : statusStr === 'error' ? 'error' as const
            : 'stopped' as const,
          backendId: name,
          manageable: true,
        };
      });
    } catch {
      return [];
    }
  }

  async getInfo(id: string): Promise<Service | null> {
    const services = await this.list();
    return services.find(s => s.backendId === id) ?? null;
  }

  async performAction(id: string, action: ServiceAction): Promise<{ success: boolean; message: string }> {
    try {
      await execFileAsync('brew', ['services', action, id]);
      return { success: true, message: `${action}ed ${id}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed to ${action} ${id}: ${msg}` };
    }
  }

  async getLogs(id: string, lines = 50): Promise<string> {
    const service = await this.getInfo(id);
    if (!service?.logPaths?.stdout) return 'No log path configured';

    try {
      const { stdout } = await execFileAsync('tail', ['-n', String(lines), service.logPaths.stdout]);
      return stdout;
    } catch {
      return `Could not read log file: ${service.logPaths.stdout}`;
    }
  }
}
