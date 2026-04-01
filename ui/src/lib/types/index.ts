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
