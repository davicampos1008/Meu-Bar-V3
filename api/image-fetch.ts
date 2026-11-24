import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  executeImageFetch,
  verifySuperAdminBearerToken,
} from '../server/imageSearchCore.ts';

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > 1024 * 1024) break;
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if ((req.method || 'GET').toUpperCase() !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const authCheck = await verifySuperAdminBearerToken(req.headers.authorization);
  if (!authCheck.ok) {
    sendJson(res, authCheck.status, { error: authCheck.error });
    return;
  }

  const body = await readJsonBody(req);
  const result = await executeImageFetch(String(body.url || ''));
  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    contentType: result.contentType,
    byteLength: result.byteLength,
    ext: result.ext,
    dataUrl: result.dataUrl,
  });
}
