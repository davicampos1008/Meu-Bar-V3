import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import {
  executeImageFetch,
  executeImageSearch,
  verifySuperAdminBearerToken,
} from './server/imageSearchCore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Pesquisa real na Internet por fotos de drinks com filtros de definição/profissionalismo (somente ADM)
  app.get('/api/image-search', async (req, res) => {
    const authCheck = await verifySuperAdminBearerToken(req.headers.authorization);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }

    const result = await executeImageSearch({
      rawQuery: String(req.query.q || ''),
      quality: String(req.query.quality || 'hd'),
      orientation: String(req.query.orientation || 'any'),
      proOnly: String(req.query.proOnly ?? 'true') !== 'false',
      enhancePro: String(req.query.enhance ?? 'true') !== 'false',
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({
      query: result.query,
      total: result.total,
      results: result.results,
    });
  });

  // Proxy seguro para baixar imagem escolhida pelo navegador (somente ADM; evita bloqueio CORS e SSRF)
  app.post('/api/image-fetch', async (req, res) => {
    const authCheck = await verifySuperAdminBearerToken(req.headers.authorization);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }

    const result = await executeImageFetch(String(req.body?.url || ''));
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({
      ok: true,
      contentType: result.contentType,
      byteLength: result.byteLength,
      ext: result.ext,
      dataUrl: result.dataUrl,
    });
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/menu.html', (_req, res) => {
      res.sendFile(path.join(distDir, 'menu.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const hmrEnabled = process.env.DISABLE_HMR !== 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrEnabled ? { server: httpServer } : false,
        ws: { server: httpServer },
        watch: hmrEnabled ? {} : null,
      },
      appType: 'mpa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Meu Bar server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
