import type { Service, DoctorIssue, KennelConfig, ServiceAction, Terminal } from './types';

const BASE = '';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getServices(backend?: string, status?: string): Promise<Service[]> {
  const params = new URLSearchParams();
  if (backend && backend !== 'all') params.set('backend', backend);
  if (status && status !== 'all') params.set('status', status);
  const qs = params.toString();
  return fetchJSON<Service[]>(`/api/services${qs ? `?${qs}` : ''}`);
}

export async function getService(name: string): Promise<Service> {
  return fetchJSON<Service>(`/api/services/${encodeURIComponent(name)}`);
}

export async function performAction(name: string, action: ServiceAction): Promise<{ success: boolean; message: string }> {
  return fetchJSON('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, action }),
  });
}

export async function getLogs(name: string, lines = 50): Promise<string> {
  const data = await fetchJSON<{ logs: string }>(`/api/logs/${encodeURIComponent(name)}?lines=${lines}`);
  return data.logs;
}

export async function getDoctor(): Promise<DoctorIssue[]> {
  return fetchJSON<DoctorIssue[]>('/api/doctor');
}

export async function getConfig(): Promise<KennelConfig> {
  return fetchJSON<KennelConfig>('/api/config');
}

export async function setAlias(name: string, displayName: string | null): Promise<void> {
  await fetchJSON('/api/alias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, displayName }),
  });
}

export async function setNote(name: string, note: string | null): Promise<void> {
  await fetchJSON('/api/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, note: note || undefined }),
  });
}

export async function getTerminals(): Promise<Terminal[]> {
  return fetchJSON<Terminal[]>('/api/terminals');
}

export async function setTerminal(terminal: string): Promise<void> {
  await fetchJSON('/api/config/terminal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terminal }),
  });
}

export async function launchClaude(prompt: string): Promise<{ success: boolean; message?: string }> {
  return fetchJSON('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
}
