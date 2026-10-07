// Per-viewer display preferences (theme, typeface, text size), kept in localStorage.

export const FONTS = [
  { id: 'mona', label: 'Mona Sans' },
  { id: 'system', label: 'SF Pro' },
  { id: 'atkinson', label: 'Atkinson' },
] as const;
const SIZES = ['12px', '13px', '14px'];
const SIZE_NAMES: Record<string, string> = { '12px': 'small', '13px': 'regular', '14px': 'large' };

const root = () => document.documentElement;

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function set(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private window */ }
}

export function applySaved(): void {
  const theme = get('kennel-theme');
  if (theme) root().setAttribute('data-theme', theme);
  const font = get('kennel-font');
  if (font && font !== 'mona' && FONTS.some(f => f.id === font)) root().setAttribute('data-font', font);
  const size = get('kennel-size');
  if (size) document.body.style.fontSize = size;
}

export function toggleTheme(): string {
  const current = root().getAttribute('data-theme');
  const dark = current ? current === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  root().setAttribute('data-theme', next);
  set('kennel-theme', next);
  return next === 'dark' ? 'Dark mode' : 'Light mode';
}

export function nextFont(): string {
  const current = root().getAttribute('data-font') ?? 'mona';
  const index = FONTS.findIndex(f => f.id === current);
  const next = FONTS[(index + 1) % FONTS.length];
  if (next.id === 'mona') root().removeAttribute('data-font'); else root().setAttribute('data-font', next.id);
  set('kennel-font', next.id);
  return next.label;
}

export function nextSize(): string {
  const current = document.body.style.fontSize || '13px';
  const next = SIZES[(SIZES.indexOf(current) + 1) % SIZES.length];
  document.body.style.fontSize = next;
  set('kennel-size', next);
  return `Text ${SIZE_NAMES[next]}`;
}
