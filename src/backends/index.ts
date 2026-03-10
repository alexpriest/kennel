import { LaunchdBackend } from './launchd.js';
import { PM2Backend } from './pm2.js';
import { BrewBackend } from './brew.js';
import { CronBackend } from './cron.js';
import type { Backend } from '../types.js';

export { LaunchdBackend } from './launchd.js';
export { PM2Backend } from './pm2.js';
export { BrewBackend } from './brew.js';
export { CronBackend } from './cron.js';

export function createAllBackends(): Backend[] {
  return [
    new LaunchdBackend(),
    new PM2Backend(),
    new BrewBackend(),
    new CronBackend(),
  ];
}
