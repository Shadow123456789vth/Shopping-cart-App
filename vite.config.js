import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.SN_INSTANCE_URL;
  if (!target && mode === 'development') {
    throw new Error('SN_INSTANCE_URL is not set. Copy .env.example to .env.local and set your instance URL.');
  }

  const serviceNowProxy = {
    target,
    changeOrigin: true,
    secure: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        // The browser never sends Authorization itself; translate X-Local-Auth into Basic auth here.
        const token = req.headers['x-local-auth'];
        if (token) proxyReq.setHeader('Authorization', `Basic ${token}`);
        proxyReq.removeHeader('x-local-auth');
        // Don't forward ServiceNow session cookies: they could belong to a different account.
        proxyReq.removeHeader('cookie');
      });
      proxy.on('proxyRes', (proxyRes) => {
        // Stop the browser's native Basic-auth popup on 401 and keep cookies off localhost.
        delete proxyRes.headers['www-authenticate'];
        delete proxyRes.headers['set-cookie'];
      });
    },
  };

  return {
    plugins: [react()],
    base: './',
    server: {
      port: 5173,
      proxy: {
        '/api': serviceNowProxy,
      },
    },
    preview: {
      proxy: {
        '/api': serviceNowProxy,
      },
    },
  };
});
