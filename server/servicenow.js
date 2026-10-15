// ServiceNow login + API proxy, shared by the Vercel functions (api/) and the Vite dev server (vite.config.js).
// The browser never talks to the instance directly and never sees the ServiceNow password.
import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const readConfig = (env) => ({
  instance: env.SN_INSTANCE_URL,
  // The one account that can sign in; the server also makes every ServiceNow call with it.
  userName: env.SN_USERNAME,
  password: env.SN_PASSWORD,
  sessionSecret: env.SN_SESSION_SECRET || env.SN_PASSWORD,
});

const fail = (status, message) => Response.json({ error: { message } }, { status });

const basicAuth = (config) => `Basic ${Buffer.from(`${config.userName}:${config.password}`).toString('base64')}`;

// Compares without leaking, through timing, how much of the value matched.
const sameText = (a, b) => {
  const x = createHmac('sha256', 'compare').update(String(a)).digest();
  const y = createHmac('sha256', 'compare').update(String(b)).digest();
  return timingSafeEqual(x, y);
};

// Signed "App <payload>.<signature>" session: proves the user signed in, without holding the ServiceNow password.
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');

function issueSession(config) {
  const payload = Buffer.from(JSON.stringify({ u: config.userName, exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `App ${payload}.${sign(payload, config.sessionSecret)}`;
}

function verifySession(config, auth) {
  if (!auth?.startsWith('App ')) return false;
  const [payload, signature] = auth.slice('App '.length).split('.');
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload, config.sessionSecret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

const configError = (config) => {
  if (!config.instance) return 'SN_INSTANCE_URL is not set.';
  if (!config.userName || !config.password) return 'SN_USERNAME and SN_PASSWORD are not set.';
  return null;
};

/**
 * POST /api/login with { userName, password }: succeeds only when they match SN_USERNAME / SN_PASSWORD.
 * Returns { auth }: a signed session the browser sends back as X-SN-Auth on API calls.
 */
export async function handleLogin(request, config) {
  const error = configError(config);
  if (error) return fail(500, error);
  if (request.method !== 'POST') return fail(405, 'Method not allowed.');
  const { userName, password } = await request.json().catch(() => ({}));
  if (!userName || !password) return fail(400, 'Enter your user name and password.');

  const userOk = sameText(userName, config.userName);
  const passwordOk = sameText(password, config.password);
  if (!userOk || !passwordOk) return fail(401, 'Invalid user name or password.');
  return Response.json({ auth: issueSession(config) });
}

/** Forwards /api/now/<path> to the instance as SN_USERNAME, for requests carrying a valid session. */
export async function handleProxy(request, config, path, searchParams) {
  const error = configError(config);
  if (error) return fail(500, error);
  if (path.split('/').includes('..')) return fail(400, 'Invalid path.');
  if (!verifySession(config, request.headers.get('x-sn-auth'))) return fail(401, 'Session expired. Sign in again.');

  const target = new URL(`/api/now/${path}`, config.instance);
  target.search = searchParams.toString();

  // Forward only what ServiceNow needs: no cookies, no host headers.
  const headers = new Headers({ accept: 'application/json', authorization: basicAuth(config) });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

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
