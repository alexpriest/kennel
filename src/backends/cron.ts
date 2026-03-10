import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Backend, Service, ServiceAction } from '../types.js';

const execFileAsync = promisify(execFile);

function parseCronSchedule(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return schedule;

  const [min, hour, dom, mon, dow] = parts;

  // common patterns
  if (min === '*' && hour === '*' && dom === '*' && mon === '*' && dow === '*') return 'every minute';
  if (hour === '*' && dom === '*' && mon === '*' && dow === '*') return `every hour at :${min.padStart(2, '0')}`;
  if (dom === '*' && mon === '*' && dow === '*') return `daily at ${hour}:${min.padStart(2, '0')}`;
  if (dom === '*' && mon === '*' && dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[parseInt(dow)] ?? dow;
    return `${dayName} at ${hour}:${min.padStart(2, '0')}`;
  }

  return `${min} ${hour} ${dom} ${mon} ${dow}`;
}

function nameFromCommand(command: string): string {
  // try to extract a meaningful name from the command
  const parts = command.split(/[\/\s]+/);
  const script = parts.find(p => p.endsWith('.sh') || p.endsWith('.py') || p.endsWith('.js') || p.endsWith('.ts'));
  if (script) return script.replace(/\.[^.]+$/, '');
  // use last path component of first arg
  const firstArg = command.split(/\s+/)[0];
  return firstArg.split('/').pop() ?? 'cron-job';
}

export class CronBackend implements Backend {
  type = 'cron' as const;

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync('crontab', ['-l']);
      return true;
    } catch {
      return false; // no crontab
    }
  }

  async list(): Promise<Service[]> {
    try {
      const { stdout } = await execFileAsync('crontab', ['-l']);
      const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));

      const services: Service[] = [];
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.+)$/);
        if (!match) continue;

        const [, schedule, command] = match;
        services.push({
          name: nameFromCommand(command),
          backend: 'cron',
          status: 'scheduled',
          schedule: parseCronSchedule(schedule),
          command,
          backendId: `cron-${i}`,
          manageable: false,
        });
      }
      return services;
    } catch {
      return [];
    }
  }

  async getInfo(id: string): Promise<Service | null> {
    const services = await this.list();
    return services.find(s => s.backendId === id) ?? null;
  }

  async performAction(_id: string, _action: ServiceAction): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Cron jobs cannot be started/stopped individually. Edit crontab to manage.' };
  }

  async getLogs(_id: string, _lines?: number): Promise<string> {
    return 'Cron jobs do not have dedicated log files. Check system log or redirect output in crontab.';
  }
}
