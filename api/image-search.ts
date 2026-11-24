import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  executeImageSearch,
  verifySuperAdminBearerToken,
} from '../server/imageSearchCore.ts';

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const authCheck = await verifySuperAdminBearerToken(req.headers.authorization);
  if (!authCheck.ok) {
    sendJson(res, authCheck.status, { error: authCheck.error });
    return;
  }

  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const sp = parsedUrl.searchParams;

  const result = await executeImageSearch({
    rawQuery: sp.get('q') || '',
    quality: sp.get('quality') || 'hd',
    orientation: sp.get('orientation') || 'any',
    proOnly: sp.get('proOnly') !== 'false',
    enhancePro: sp.get('enhance') !== 'false',
  });

  if (!result.ok) {
    sendJson(res, result.status, { error: result.error });
    return;
  }

  sendJson(res, 200, {
    query: result.query,
    total: result.total,
    results: result.results,
  });
}
