import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import type { Backend, Service, ServiceAction } from '../types.js';

const execFileAsync = promisify(execFile);

interface PM2Process {
  pid: number;
  name: string;
  pm2_env: {
    status: string;
    exit_code: number;
    restart_time: number;
    pm_cwd: string;
    pm_exec_path: string;
    pm_out_log_path: string;
    pm_err_log_path: string;
    pm_pid_path: string;
    exec_interpreter: string;
    args?: string[];
    cron_restart?: string;
    created_at?: number;
  };
}

export class PM2Backend implements Backend {
  type = 'pm2' as const;

  async isAvailable(): Promise<boolean> {
    // check if PM2 daemon is already running by looking for pid file
    const pidFile = join(homedir(), '.pm2', 'pm2.pid');
    try {
      await access(pidFile, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<Service[]> {
    if (!(await this.isAvailable())) return [];

    try {
      const { stdout } = await execFileAsync('pm2', ['jlist'], { maxBuffer: 10 * 1024 * 1024 });
      const processes: PM2Process[] = JSON.parse(stdout);

      return processes.map(proc => ({
        name: proc.name,
        backend: 'pm2' as const,
        status: proc.pm2_env.status === 'online' ? 'running' as const
          : proc.pm2_env.status === 'stopped' ? 'stopped' as const
          : proc.pm2_env.status === 'errored' ? 'error' as const
          : 'unknown' as const,
        pid: proc.pid > 0 ? proc.pid : undefined,
        enabled: true,
        schedule: proc.pm2_env.cron_restart,
        command: [proc.pm2_env.exec_interpreter, proc.pm2_env.pm_exec_path, ...(proc.pm2_env.args ?? [])].join(' '),
        cwd: proc.pm2_env.pm_cwd,
        logPaths: {
          stdout: proc.pm2_env.pm_out_log_path,
          stderr: proc.pm2_env.pm_err_log_path,
        },
        exitCode: proc.pm2_env.exit_code,
        restartCount: proc.pm2_env.restart_time,
        backendId: proc.name,
        manageable: true,
      }));
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
      await execFileAsync('pm2', [action, id]);
      return { success: true, message: `${action}ed ${id}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed to ${action} ${id}: ${msg}` };
    }
  }

  async getLogs(id: string, lines = 50): Promise<string> {
    try {
      const { stdout } = await execFileAsync('pm2', ['logs', id, '--nostream', '--lines', String(lines)]);
      return stdout;
    } catch {
      return `Could not read logs for ${id}`;
    }
  }
}
