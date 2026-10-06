import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeBundle } from '../assets/js/content.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT = join(ROOT, 'content');
const FILES = ['site', 'resume', 'projects', 'pages'];
const PUBLIC_BASE = '/missing-mar-portfolio';
const ALLOWED_IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function readBundle() {
  const entries = await Promise.all(FILES.map(async name => [
    name,
    JSON.parse(await readFile(join(CONTENT, `${name}.json`), 'utf8'))
  ]));
  return Object.fromEntries(entries);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES + 1024 * 1024) {
        reject(new Error('Файл слишком большой'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function saveContent(patch) {
  const bundle = await readBundle();
  const next = { ...bundle, ...patch };

  // Validate the whole bundle before touching disk, so a bad edit in the admin
  // can never leave the site with content it cannot render.
  normalizeBundle(structuredClone(next));

  for (const name of Object.keys(patch)) {
    await writeFile(join(CONTENT, `${name}.json`), `${JSON.stringify(next[name], null, 2)}\n`, 'utf8');
  }
  return next;
}

async function saveUpload({ projectId, name, dataUrl }) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new Error('Ожидается data URL');

  const extension = extname(String(name || '')).toLowerCase() || '.png';
  if (!ALLOWED_IMAGE.has(extension)) {
    throw new Error(`Неподдерживаемый формат: ${extension}`);
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_UPLOAD_BYTES) throw new Error('Файл больше 12 МБ');

  const folder = slugify(projectId || 'general') || 'general';
  const base = slugify(String(name).slice(0, -extension.length)) || 'image';
  const fileName = `${Date.now().toString(36)}-${base}${extension}`;
  const directory = join(ROOT, 'assets', 'media', 'projects', folder, 'uploads');

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, fileName), buffer);
  return `${PUBLIC_BASE}/assets/media/projects/${folder}/uploads/${fileName}`;
}

export function adminPlugin() {
  return {
    name: 'missing-mar-admin',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = (request.url || '').split('?')[0];
        if (!url.startsWith('/admin')) return next();

        try {
          if (url === '/admin' || url === '/admin/' || url === '/admin/index.html') {
            const html = await readFile(join(ROOT, 'admin', 'index.html'), 'utf8');
            response.setHeader('content-type', 'text/html; charset=utf-8');
            response.end(html);
            return;
          }

          if (url === '/admin/api/content' && request.method === 'GET') {
            send(response, 200, await readBundle());
            return;
          }

          if (url === '/admin/api/content' && request.method === 'PUT') {
            const patch = JSON.parse(await readBody(request));
            const unknown = Object.keys(patch).filter(name => !FILES.includes(name));
            if (unknown.length) throw new Error(`Неизвестный файл: ${unknown.join(', ')}`);
            await saveContent(patch);
            send(response, 200, { ok: true });
            return;
          }

          if (url === '/admin/api/upload' && request.method === 'POST') {
            const path = await saveUpload(JSON.parse(await readBody(request)));
            send(response, 200, { path });
            return;
          }

          next();
        } catch (error) {
          send(response, 400, { error: error.message });
        }
      });
    }
  };
}
