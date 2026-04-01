import { writable } from 'svelte/store';
import type { KennelConfig, Terminal, Theme } from '../types';
import * as api from '../api';

export const config = writable<KennelConfig>({ aliases: {}, notes: {} });
export const terminals = writable<Terminal[]>([]);
export const theme = writable<Theme>('dark');

export async function refreshConfig(): Promise<void> {
  try {
    const [cfg, terms] = await Promise.all([api.getConfig(), api.getTerminals()]);
    config.set(cfg);
    terminals.set(terms);
  } catch (e) {
    console.error('Failed to load config:', e);
  }
}

export function toggleTheme(): void {
  theme.update(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kennel-theme', next);
    return next;
  });
}

export function initTheme(): void {
  const saved = localStorage.getItem('kennel-theme') as Theme | null;
  const t = saved || 'dark';
  theme.set(t);
  document.documentElement.setAttribute('data-theme', t);
}
