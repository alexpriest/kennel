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

export interface Backend {
  type: BackendType;
  isAvailable(): Promise<boolean>;
  list(): Promise<Service[]>;
  getInfo(id: string): Promise<Service | null>;
  performAction(id: string, action: ServiceAction): Promise<{ success: boolean; message: string }>;
  getLogs(id: string, lines?: number): Promise<string>;
}

export interface DoctorIssue {
  severity: 'error' | 'warning' | 'info';
  service: string;
  backend: BackendType;
  message: string;
  suggestion?: string;
}
