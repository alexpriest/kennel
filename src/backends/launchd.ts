import { execFile } from 'node:child_process';
import { readdir, access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import type { Backend, Service, ServiceAction } from '../types.js';
import { formatSchedule, type CalendarInterval } from '../schedule.js';

const execFileAsync = promisify(execFile);

interface PlistData {
  Label?: string;
  ProgramArguments?: string[];
  Program?: string;
  StartInterval?: number;
  StartCalendarInterval?: CalendarInterval | CalendarInterval[];
  RunAtLoad?: boolean;
  StandardOutPath?: string;
  StandardErrorPath?: string;
  WorkingDirectory?: string;
  KeepAlive?: boolean | Record<string, unknown>;
  EnvironmentVariables?: Record<string, string>;
}

interface LaunchctlEntry {
  pid: number | null;
  exitCode: number;
  label: string;
}

export function parseLaunchctlList(output: string): LaunchctlEntry[] {
  const entries: LaunchctlEntry[] = [];
  for (const line of output.trim().split('\n').slice(1)) {
    const parts = line.trim().split(/\t/);
    if (parts.length < 3) continue;
    entries.push({
      pid: parts[0] === '-' ? null : parseInt(parts[0], 10),
      exitCode: parseInt(parts[1], 10),
      label: parts[2],
    });
  }
  return entries;
}

export class LaunchdBackend implements Backend {
  type = 'launchd' as const;

  async isAvailable(): Promise<boolean> {
    return true; // always available on macOS
  }

  private get agentsDir(): string {
    return join(homedir(), 'Library', 'LaunchAgents');
  }

  async list(): Promise<Service[]> {
    let launchctlEntries: LaunchctlEntry[] = [];
    try {
      const { stdout } = await execFileAsync('launchctl', ['list']);
      launchctlEntries = parseLaunchctlList(stdout);
    } catch {
      // fallback: no status info
    }

    const statusMap = new Map(launchctlEntries.map(e => [e.label, e]));

    let plistFiles: string[] = [];
    try {
      const files = await readdir(this.agentsDir);
      plistFiles = files.filter(f => f.endsWith('.plist'));
    } catch {
      return [];
    }

    const services: Service[] = [];
    for (const file of plistFiles) {
      const filePath = join(this.agentsDir, file);
      const plist = await this.parsePlist(filePath);
      if (!plist?.Label) continue;

      // skip brew-managed plists
      if (plist.Label.startsWith('homebrew.mxcl.')) continue;

      const entry = statusMap.get(plist.Label);
      const command = plist.ProgramArguments?.join(' ') ?? plist.Program;

      let status: Service['status'] = 'unknown';
      if (entry) {
        if (entry.pid !== null && entry.pid > 0) status = 'running';
        else if (entry.exitCode !== 0) status = 'error';
        else status = 'stopped';
      }

      services.push({
        name: plist.Label,
        backend: 'launchd',
        status,
        pid: entry?.pid ?? undefined,
        enabled: plist.RunAtLoad ?? false,
        schedule: plist.StartInterval || plist.StartCalendarInterval ? formatSchedule(plist) : undefined,
        configPath: filePath,
        command,
        cwd: plist.WorkingDirectory,
        logPaths: {
          stdout: plist.StandardOutPath,
          stderr: plist.StandardErrorPath,
        },
        exitCode: entry?.exitCode,
        backendId: plist.Label,
        manageable: true,
      });
    }

    return services;
  }

  async getInfo(id: string): Promise<Service | null> {
    const services = await this.list();
    return services.find(s => s.backendId === id) ?? null;
  }

  async performAction(id: string, action: ServiceAction): Promise<{ success: boolean; message: string }> {
    const uid = process.getuid?.() ?? 501;
    const target = `gui/${uid}/${id}`;

    try {
      if (action === 'stop') {
        await execFileAsync('launchctl', ['bootout', `gui/${uid}`, this.plistPathFor(id)]);
        return { success: true, message: `Stopped ${id}` };
      }
      if (action === 'start') {
        await execFileAsync('launchctl', ['bootstrap', `gui/${uid}`, this.plistPathFor(id)]);
        return { success: true, message: `Started ${id}` };
      }
      if (action === 'restart') {
        try { await execFileAsync('launchctl', ['bootout', `gui/${uid}`, this.plistPathFor(id)]); } catch { /* may not be loaded */ }
        await execFileAsync('launchctl', ['bootstrap', `gui/${uid}`, this.plistPathFor(id)]);
        return { success: true, message: `Restarted ${id}` };
      }
      return { success: false, message: `Unknown action: ${action}` };
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

  private plistPathFor(label: string): string {
    return join(this.agentsDir, `${label}.plist`);
  }

  private async parsePlist(path: string): Promise<PlistData | null> {
    try {
      const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', path]);
      return JSON.parse(stdout);
    } catch {
      return null;
    }
  }
}
