export type BackendType = 'launchd' | 'pm2' | 'cron' | 'brew';
export type ServiceStatus = 'running' | 'stopped' | 'error' | 'scheduled' | 'unknown';
export type ServiceAction = 'start' | 'stop' | 'restart';

export interface Service {
  name: string;
  backend: BackendType;
  status: ServiceStatus;
  pid?: number;
  enabled?: boolean;
  schedule?: string;
  configPath?: string;
  command?: string;
  cwd?: string;
  logPaths?: { stdout?: string; stderr?: string };
  exitCode?: number;
  restartCount?: number;
  backendId: string;
  manageable: boolean;
}

export interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  service: string;
  backend: BackendType;
  message: string;
  suggestion?: string;
}

export type RunStatus = 'running' | 'ok' | 'failed';
export type TaskStatus = RunStatus | 'never run';

export interface ScheduledTask {
  label: string;
  name: string;
  slug: string;
  kind: 'llm' | 'script';
  schedule: string;
  nextRun: string | null;
  lastRunStart: string | null;
  lastRunFinish: string | null;
  status: TaskStatus;
  durationS: number | null;
  costUsd: number | null;
  error: string | null;
  docPath: string | null;
  docUrl: string | null;
  recent: RunStatus[];
}

export interface KennelConfig {
  aliases: Record<string, string>;
  notes: Record<string, string>;
  terminal?: string;
}

export interface Terminal {
  name: string;
}

export type Theme = 'dark' | 'light';

export type FilterBackend = BackendType | 'all';
export type FilterStatus = ServiceStatus | 'all';
