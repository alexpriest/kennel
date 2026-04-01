import { writable, derived } from 'svelte/store';
import type { Service, FilterBackend, FilterStatus } from '../types';
import * as api from '../api';

export const services = writable<Service[]>([]);
export const loading = writable(true);
export const searchQuery = writable('');
export const filterBackend = writable<FilterBackend>('all');
export const filterStatus = writable<FilterStatus>('all');

export const filteredServices = derived(
  [services, searchQuery, filterBackend, filterStatus],
  ([$services, $search, $backend, $status]) => {
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

    return result;
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
