import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Registry } from './registry.js';
import { runDoctor } from './doctor.js';
import { getDashboardHtml } from './dashboard.js';
import type { BackendType, ServiceStatus } from './types.js';

const registry = new Registry();

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Dashboard HTML
  if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getDashboardHtml());
    return;
  }

  // API: list services
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

  // API: service info
  if (pathname.startsWith('/api/services/') && req.method === 'GET') {
    const name = decodeURIComponent(pathname.slice('/api/services/'.length));
    const service = await registry.getService(name);
    if (!service) return json(res, { error: 'Not found' }, 404);
    json(res, service);
    return;
  }

  // API: service action
  if (pathname === '/api/action' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const result = await registry.performAction(body.name, body.action);
    json(res, result);
    return;
  }

  // API: service logs
  if (pathname.startsWith('/api/logs/') && req.method === 'GET') {
    const name = decodeURIComponent(pathname.slice('/api/logs/'.length));
    const lines = parseInt(params.get('lines') ?? '50');
    const logs = await registry.getLogs(name, lines);
    json(res, { logs });
    return;
  }

  // API: doctor
  if (pathname === '/api/doctor' && req.method === 'GET') {
    const issues = await runDoctor(registry);
    json(res, issues);
    return;
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
