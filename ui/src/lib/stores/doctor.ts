import { writable } from 'svelte/store';
import type { DoctorIssue } from '../types';
import * as api from '../api';

export const doctorIssues = writable<DoctorIssue[]>([]);
export const doctorLoading = writable(false);

export async function refreshDoctor(): Promise<void> {
  doctorLoading.set(true);
  try {
    const issues = await api.getDoctor();
    doctorIssues.set(issues);
  } catch (e) {
    console.error('Failed to run doctor:', e);
  } finally {
    doctorLoading.set(false);
  }
}
