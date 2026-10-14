// ServiceNow login + API proxy, shared by the Vercel functions (api/) and the Vite dev server (vite.config.js).
// The browser never talks to the instance directly and never sees the OAuth client secret.
import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const readConfig = (env) => ({
  instance: env.SN_INSTANCE_URL,
  clientId: env.SN_CLIENT_ID,
  clientSecret: env.SN_CLIENT_SECRET,
  // client_credentials: API calls run as the OAuth app's user; password: each shopper gets their own token.
  grant: env.SN_OAUTH_GRANT || 'client_credentials',
  sessionSecret: env.SN_SESSION_SECRET || env.SN_CLIENT_SECRET,
});

const hasOAuthClient = (config) => Boolean(config.clientId && config.clientSecret);
const fail = (status, message) => Response.json({ error: { message } }, { status });

async function requestToken(config, params) {
  const res = await fetch(new URL('/oauth_token.do', config.instance), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && Boolean(data.access_token), status: res.status, data };
}

// Client credentials token, cached per server instance until shortly before it expires.
let appToken = null;
async function getAppToken(config) {
  if (appToken && appToken.expiresAt > Date.now()) return appToken.value;
  const { ok, status, data } = await requestToken(config, { grant_type: 'client_credentials' });
  if (!ok) throw new Error(`ServiceNow client credentials token request failed (${status}): ${data.error_description || data.error || 'no token'}`);
  const ttl = (Number(data.expires_in) || 1800) * 1000;
  appToken = { value: data.access_token, expiresAt: Date.now() + ttl - 60_000 };
  return appToken.value;
}

// Signed "App <payload>.<signature>" session: proves the shopper signed in, without holding any ServiceNow secret.
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');

function issueAppSession(config, userName) {
  const payload = Buffer.from(JSON.stringify({ u: userName, exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `App ${payload}.${sign(payload, config.sessionSecret)}`;
}

function verifyAppSession(config, auth) {
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

async function checkPassword(config, userName, password) {
  const auth = `Basic ${Buffer.from(`${userName}:${password}`).toString('base64')}`;
  const res = await fetch(new URL('/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id', config.instance), {
    headers: { accept: 'application/json', authorization: auth },
  });
  return res.status === 401 ? null : auth;
}

/**
 * POST /api/login with { userName, password } or { refreshToken }.
 * Returns { auth, refreshToken? }: auth is what the browser sends back as X-SN-Auth on API calls.
 */
export async function handleLogin(request, config) {
  if (!config.instance) return fail(500, 'SN_INSTANCE_URL is not set.');
  if (request.method !== 'POST') return fail(405, 'Method not allowed.');
  const { userName, password, refreshToken } = await request.json().catch(() => ({}));
  if (!refreshToken && (!userName || !password)) return fail(400, 'Enter your user name and password.');

  if (hasOAuthClient(config) && config.grant === 'password') {
    const { ok, status, data } = await requestToken(
      config,
      refreshToken
        ? { grant_type: 'refresh_token', refresh_token: refreshToken }
        : { grant_type: 'password', username: userName, password },
    );
    if (ok) return Response.json({ auth: `Bearer ${data.access_token}`, refreshToken: data.refresh_token });
    if (status === 400 || status === 401) return fail(401, 'Invalid user name or password.');
    return fail(502, `ServiceNow OAuth token request failed (${status}).`);
  }

  if (refreshToken) return fail(401, 'Session expired.');
  const basicAuth = await checkPassword(config, userName, password);
  if (!basicAuth) return fail(401, 'Invalid user name or password.');
  if (!hasOAuthClient(config)) return Response.json({ auth: basicAuth });

  try {
    await getAppToken(config); // fail the login now if the OAuth client is misconfigured
  } catch (err) {
    return fail(502, err.message);
  }
  return Response.json({ auth: issueAppSession(config, userName) });
}

async function resolveAuthorization(config, auth) {
  if (!auth) return null;
  if (auth.startsWith('App ')) return verifyAppSession(config, auth) ? `Bearer ${await getAppToken(config)}` : null;
  return /^(Basic|Bearer) \S+$/.test(auth) ? auth : null;
}

/** Forwards /api/now/<path> to the instance with the Authorization that matches the X-SN-Auth header. */
export async function handleProxy(request, config, path, searchParams) {
  if (!config.instance) return fail(500, 'SN_INSTANCE_URL is not set.');
  if (path.split('/').includes('..')) return fail(400, 'Invalid path.');

  const target = new URL(`/api/now/${path}`, config.instance);
  target.search = searchParams.toString();

  // Forward only what ServiceNow needs: no cookies (they could belong to another account), no host headers.
  const headers = new Headers({ accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const auth = request.headers.get('x-sn-auth');
  let authorization;
  try {
    authorization = await resolveAuthorization(config, auth);
  } catch (err) {
    return fail(502, err.message);
  }
  if (authorization) headers.set('authorization', authorization);

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
  // Shows in DevTools which kind of credentials reached ServiceNow, without exposing them.
  out.set('x-shopnow-auth', authorization ? auth.split(' ')[0].toLowerCase() : 'missing');
  return new Response(res.status === 204 ? null : await res.arrayBuffer(), { status: res.status, headers: out });
}
