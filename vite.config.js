import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleLogin, handleProxy, readConfig } from './server/servicenow.js';

// Serves /api/login and /api/now/* in dev and preview with the same code as the Vercel functions in api/.
function serviceNowApi(config) {
  const middleware = async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const isLogin = url.pathname === '/api/login';
    if (!isLogin && !url.pathname.startsWith('/api/now/')) return next();
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const headers = new Headers();
      ['content-type', 'x-sn-auth'].forEach((h) => req.headers[h] && headers.set(h, req.headers[h]));
      const request = new Request(url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined });

      const response = isLogin
        ? await handleLogin(request, config)
        : await handleProxy(request, config, url.pathname.slice('/api/now/'.length), url.searchParams);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      next(err);
    }
  };
  return {
    name: 'servicenow-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const config = readConfig(loadEnv(mode, process.cwd(), ''));
  if (!config.instance && mode === 'development') {
    throw new Error('SN_INSTANCE_URL is not set. Copy .env.example to .env.local and set your instance URL.');
  }

  return {
    plugins: [react(), serviceNowApi(config)],
    base: './',
    server: { port: 5173 },
  };
});
