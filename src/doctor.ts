import { execFile } from 'node:child_process';
import { access, constants, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { Registry } from './registry.js';
import type { DoctorIssue, Service } from './types.js';

const execFileAsync = promisify(execFile);

const SECRET_PATTERNS = [
  /[A-Za-z0-9_]*(api[_-]?key|secret|token|password|credential)[A-Za-z0-9_]*/i,
  /sk-[a-zA-Z0-9-]{20,}/,  // API keys like sk-ant-...
  /[0-9a-f]{32,}/i,         // long hex strings
];

async function pidExists(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function executableExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkStalePid(service: Service): Promise<DoctorIssue | null> {
  if (service.pid && service.status === 'running') {
    const exists = await pidExists(service.pid);
    if (!exists) {
      return {
        severity: 'error',
        service: service.name,
        backend: service.backend,
        message: `PID ${service.pid} no longer exists but service reports running`,
        suggestion: `Restart with: kennel restart ${service.name}`,
      };
    }
  }
  return null;
}

async function checkMissingExecutable(service: Service): Promise<DoctorIssue | null> {
  // only check launchd services where we can reliably get the executable path
  // the command field is a joined string which breaks on paths with spaces
  if (service.backend !== 'launchd' || !service.configPath) return null;

  try {
    const { stdout } = await execFileAsync('plutil', ['-convert', 'json', '-o', '-', service.configPath]);
    const plist = JSON.parse(stdout);
    const exe = plist.ProgramArguments?.[0] ?? plist.Program;
    if (!exe || !exe.startsWith('/')) return null;

    const exists = await executableExists(exe);
    if (!exists) {
      return {
        severity: 'error',
        service: service.name,
        backend: service.backend,
        message: `Executable not found: ${exe}`,
        suggestion: 'Check if the program has been moved or uninstalled',
      };
    }
  } catch {
    // can't read plist, skip
  }
  return null;
}

async function checkErrorState(service: Service): Promise<DoctorIssue | null> {
  if (service.status === 'error') {
    return {
      severity: 'error',
      service: service.name,
      backend: service.backend,
      message: `Service is in error state${service.exitCode !== undefined ? ` (exit code ${service.exitCode})` : ''}`,
      suggestion: `Check logs: kennel logs ${service.name}`,
    };
  }
  return null;
}

async function checkSecretsInConfig(service: Service): Promise<DoctorIssue | null> {
  if (!service.configPath || !service.configPath.endsWith('.plist')) return null;

  try {
    const content = await readFile(service.configPath, 'utf-8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        // verify it's actually a value, not just a key name
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes('<string>') && pattern.test(line)) {
            return {
              severity: 'warning',
              service: service.name,
              backend: service.backend,
              message: 'Config file may contain hardcoded secrets',
              suggestion: 'Consider using environment variables or a keychain instead',
            };
          }
        }
      }
    }
  } catch {
    // can't read config, skip
  }
  return null;
}

export async function runDoctor(registry?: Registry): Promise<DoctorIssue[]> {
  const reg = registry ?? new Registry();
  const services = await reg.listServices();
  const issues: DoctorIssue[] = [];

  const checks = services.flatMap(service => [
    checkStalePid(service),
    checkMissingExecutable(service),
    checkErrorState(service),
    checkSecretsInConfig(service),
  ]);

  const results = await Promise.all(checks);
  for (const result of results) {
    if (result) issues.push(result);
  }

  return issues.sort((a, b) => {
    const sevOrder = { error: 0, warning: 1, info: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}
