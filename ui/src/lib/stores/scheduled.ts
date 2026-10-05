import { writable } from 'svelte/store';
import type { ScheduledTask } from '../types';
import * as api from '../api';

export const scheduledTasks = writable<ScheduledTask[]>([]);
export const scheduledLoading = writable(true);

export async function refreshScheduled(): Promise<void> {
  try {
    scheduledTasks.set(await api.getScheduled());
  } catch (e) {
    console.error('Failed to load scheduled tasks:', e);
  } finally {
    scheduledLoading.set(false);
  }
}
