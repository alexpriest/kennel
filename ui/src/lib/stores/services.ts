import { writable, derived } from 'svelte/store';
import type { Service, FilterBackend, FilterStatus } from '../types';
import * as api from '../api';

export type SortColumn = 'name' | 'backend' | 'status' | 'pid' | 'schedule';
export type SortDirection = 'asc' | 'desc';

export const services = writable<Service[]>([]);
export const loading = writable(true);
export const searchQuery = writable('');
export const filterBackend = writable<FilterBackend>('all');
export const filterStatus = writable<FilterStatus>('all');
export const sortColumn = writable<SortColumn>('name');
export const sortDirection = writable<SortDirection>('asc');

const STATUS_ORDER: Record<string, number> = {
  error: 0, running: 1, scheduled: 2, unknown: 3, stopped: 4,
};

function compareServices(a: Service, b: Service, col: SortColumn, dir: SortDirection): number {
  let cmp = 0;
  switch (col) {
    case 'name':
      cmp = a.name.localeCompare(b.name);
      break;
    case 'backend':
      cmp = a.backend.localeCompare(b.backend);
      break;
    case 'status':
      cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      break;
    case 'pid':
      cmp = (a.pid ?? 0) - (b.pid ?? 0);
      break;
    case 'schedule':
      cmp = (a.schedule ?? '').localeCompare(b.schedule ?? '');
      break;
  }
  return dir === 'desc' ? -cmp : cmp;
}

export function toggleSort(col: SortColumn) {
  sortColumn.update(current => {
    if (current === col) {
      sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      sortDirection.set('asc');
    }
    return col;
  });
}

export const filteredServices = derived(
  [services, searchQuery, filterBackend, filterStatus, sortColumn, sortDirection],
  ([$services, $search, $backend, $status, $sortCol, $sortDir]) => {
    let result = $services;

    if ($backend !== 'all') {
      result = result.filter(s => s.backend === $backend);
    }

    if ($status !== 'all') {
      result = result.filter(s => s.status === $status);
    }

    if ($search) {
      const q = $search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.backendId.toLowerCase().includes(q) ||
        s.backend.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => compareServices(a, b, $sortCol, $sortDir));
  }
);

export const stats = derived(services, ($services) => {
  const total = $services.length;
  const running = $services.filter(s => s.status === 'running').length;
  const errored = $services.filter(s => s.status === 'error').length;
  const stopped = $services.filter(s => s.status === 'stopped').length;
  return { total, running, errored, stopped };
});

export async function refreshServices(): Promise<void> {
  try {
    const data = await api.getServices();
    services.set(data);
  } catch (e) {
    console.error('Failed to fetch services:', e);
  } finally {
    loading.set(false);
  }
}
