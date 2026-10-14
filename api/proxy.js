// Vercel serverless proxy: production counterpart of the Vite dev proxy in vite.config.js.
// vercel.json rewrites /api/now/* here as /api/proxy?path=*.
const HOP_HEADERS = ['host', 'cookie', 'connection', 'content-length', 'accept-encoding', 'x-local-auth'];

async function handle(request) {
  const instance = process.env.SN_INSTANCE_URL;
  if (!instance) {
    return Response.json(
      { error: { message: 'SN_INSTANCE_URL is not set in the Vercel project environment variables.' } },
      { status: 500 },
    );
  }

  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('path') || '';
  incoming.searchParams.delete('path');
  const target = new URL(`/api/now/${path}`, instance);
  target.search = incoming.searchParams.toString();

  const headers = new Headers(request.headers);
  HOP_HEADERS.forEach((h) => headers.delete(h));
  // Accept the dev-style header too; don't forward ServiceNow session cookies (they could belong to another account).
  const localAuth = request.headers.get('x-local-auth');
  if (localAuth && !headers.has('authorization')) headers.set('authorization', `Basic ${localAuth}`);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    redirect: 'manual',
  });

  const out = new Headers(res.headers);
  // Stop the browser's native Basic-auth popup on 401 and keep ServiceNow cookies off this domain.
  ['www-authenticate', 'set-cookie', 'content-encoding', 'content-length', 'transfer-encoding'].forEach((h) => out.delete(h));
  return new Response(res.status === 204 ? null : await res.arrayBuffer(), { status: res.status, headers: out });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
