import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { exec } from 'node:child_process';
import { access, readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Registry } from './registry.js';
import { runDoctor } from './doctor.js';
import { getDashboardHtml } from './dashboard.js';
import { loadConfig, saveConfig, CLAUDE_DIR, ensureClaudeDir } from './config.js';
import type { BackendType, ServiceStatus } from './types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const UI_DIST = join(__dirname, '..', 'ui', 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStaticFile(res: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function hasUiDist(): Promise<boolean> {
  try {
    const s = await stat(join(UI_DIST, 'index.html'));
    return s.isFile();
  } catch {
    return false;
  }
}

const registry = new Registry();

const KNOWN_TERMINALS = [
  { name: 'cmux', check: '/Applications/cmux.app' },
  { name: 'Ghostty', check: '/Applications/Ghostty.app' },
  { name: 'Terminal', check: '/System/Applications/Utilities/Terminal.app' },
  { name: 'iTerm2', check: '/Applications/iTerm.app' },
  { name: 'Kitty', check: '/Applications/kitty.app' },
  { name: 'Alacritty', check: '/Applications/Alacritty.app' },
  { name: 'Warp', check: '/Applications/Warp.app' },
  { name: 'WezTerm', check: '/Applications/WezTerm.app' },
];

async function detectTerminals(): Promise<{ name: string }[]> {
  const detected: { name: string }[] = [];
  for (const t of KNOWN_TERMINALS) {
    if (t.check) {
      try { await access(t.check); detected.push({ name: t.name }); } catch {}
    }
  }
  return detected;
}

function escapeForDoubleQuotes(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function buildTerminalCommand(terminal: string, prompt: string, claudeDir: string): string {
  const safePrompt = prompt.replace(/'/g, "'\"'\"'");
  // cd into the kennel claude dir so all sessions are grouped
  const cdAndClaude = `cd ${claudeDir} && claude '"'"'${safePrompt}'"'"'`;

  switch (terminal) {
    case 'cmux':
      return `cmux new-workspace --command '${cdAndClaude}'`;

    case 'Ghostty':
      return `open -na Ghostty --args -e bash -c '${cdAndClaude}'`;

    case 'iTerm2': {
      const dqPrompt = escapeForDoubleQuotes(prompt);
      const dqDir = escapeForDoubleQuotes(claudeDir);
      return `osascript -e 'tell application "iTerm2"' -e 'activate' -e 'create window with default profile' -e 'tell current session of current window to write text "cd ${dqDir} && claude \\"${dqPrompt}\\""' -e 'end tell'`;
    }

    case 'Kitty':
      return `kitty --single-instance bash -c '${cdAndClaude}'`;

    case 'Alacritty':
      return `alacritty -e bash -c '${cdAndClaude}'`;

    case 'WezTerm':
      return `wezterm start -- bash -c '${cdAndClaude}'`;

    case 'Warp':
    case 'Terminal':
    default: {
      const dqPrompt = escapeForDoubleQuotes(prompt);
      const dqDir = escapeForDoubleQuotes(claudeDir);
      return `osascript -e 'tell application "Terminal" to activate' -e 'tell application "Terminal" to do script "cd ${dqDir} && claude \\"${dqPrompt}\\""'`;
    }
  }
}

function isLocalOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin ?? '';
  return !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:5544' });
  res.end(JSON.stringify(data));
}

function parseUrl(req: IncomingMessage): { pathname: string; params: URLSearchParams } {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return { pathname: url.pathname, params: url.searchParams };
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const { pathname, params } = parseUrl(req);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://localhost:5544',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Block cross-origin POST requests (CSRF protection)
  if (req.method === 'POST' && !isLocalOrigin(req)) {
    json(res, { error: 'Forbidden' }, 403);
    return;
  }

  if (pathname === '/' && req.method === 'GET') {
    // Serve Svelte UI if built, otherwise fall back to inline HTML
    if (await hasUiDist()) {
      await serveStaticFile(res, join(UI_DIST, 'index.html'));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getDashboardHtml());
    return;
  }

  if (pathname === '/api/services' && req.method === 'GET') {
    const backend = params.get('backend') as BackendType | null;
    const status = params.get('status') as ServiceStatus | null;
    const services = await registry.listServices({
      backend: backend ?? undefined,
      status: status ?? undefined,
    });
    json(res, services);
    return;
  }

  if (pathname.startsWith('/api/services/') && req.method === 'GET') {
    const name = decodeURIComponent(pathname.slice('/api/services/'.length));
    const service = await registry.getService(name);
    if (!service) return json(res, { error: 'Not found' }, 404);
    json(res, service);
    return;
  }

  if (pathname === '/api/action' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const result = await registry.performAction(body.name, body.action);
    json(res, result);
    return;
  }

  if (pathname.startsWith('/api/logs/') && req.method === 'GET') {
    const name = decodeURIComponent(pathname.slice('/api/logs/'.length));
    const lines = parseInt(params.get('lines') ?? '50');
    const logs = await registry.getLogs(name, lines);
    json(res, { logs });
    return;
  }

  if (pathname === '/api/doctor' && req.method === 'GET') {
    const issues = await runDoctor(registry);
    json(res, issues);
    return;
  }

  if (pathname === '/api/config' && req.method === 'GET') {
    const config = await loadConfig();
    json(res, config);
    return;
  }

  if (pathname === '/api/alias' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const config = await loadConfig();
    if (body.displayName) {
      config.aliases[body.name] = body.displayName;
    } else {
      delete config.aliases[body.name];
    }
    await saveConfig(config);
    json(res, { success: true });
    return;
  }

  if (pathname === '/api/note' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const config = await loadConfig();
    if (body.note) {
      config.notes[body.name] = body.note;
    } else {
      delete config.notes[body.name];
    }
    await saveConfig(config);
    json(res, { success: true });
    return;
  }

  if (pathname === '/api/terminals' && req.method === 'GET') {
    const terminals = await detectTerminals();
    json(res, terminals);
    return;
  }

  if (pathname === '/api/config/terminal' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const config = await loadConfig();
    config.terminal = body.terminal;
    await saveConfig(config);
    json(res, { success: true });
    return;
  }

  if (pathname === '/api/claude' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const config = await loadConfig();
      const terminal = config.terminal || 'Terminal';
      await ensureClaudeDir();
      const cmd = buildTerminalCommand(terminal, body.prompt, CLAUDE_DIR);

      const result = await new Promise<{ success: boolean; message?: string; command?: string }>((resolve) => {
        exec(cmd, (err) => {
          resolve(err
            ? { success: false, message: err.message, command: cmd }
            : { success: true, command: cmd }
          );
        });
      });
      json(res, result);
    } catch (err: any) {
      json(res, { success: false, message: err.message });
    }
    return;
  }

  // Serve static files from ui/dist/ (CSS, JS, assets)
  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    const filePath = resolve(join(UI_DIST, pathname));
    if (!filePath.startsWith(resolve(UI_DIST))) {
      json(res, { error: 'Forbidden' }, 403);
      return;
    }
    if (await serveStaticFile(res, filePath)) return;
  }

  json(res, { error: 'Not found' }, 404);
}

export function startDashboard(port: number): Promise<void> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      handleRequest(req, res).catch(err => {
        console.error('Request error:', err);
        json(res, { error: 'Internal server error' }, 500);
      });
    });

    server.listen(port, () => {
      resolve();
    });
  });
}
