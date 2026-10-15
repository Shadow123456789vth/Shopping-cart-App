// ServiceNow login + API proxy, shared by the Vercel functions (api/) and the Vite dev server (vite.config.js).
// The browser never talks to the instance directly; every call goes out with Basic auth.

export const readConfig = (env) => ({
  instance: env.SN_INSTANCE_URL,
});

const fail = (status, message) => Response.json({ error: { message } }, { status });

const basicAuth = (userName, password) => `Basic ${Buffer.from(`${userName}:${password}`).toString('base64')}`;

// A Table API call is the cheapest reliable check: ServiceNow answers 401 for a wrong user name or password.
async function checkPassword(config, auth) {
  const res = await fetch(new URL('/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id', config.instance), {
    headers: { accept: 'application/json', authorization: auth },
  });
  if (res.status === 401) return false;
  // 403 means the password is right but the account cannot read sys_user; the app reports that after login.
  if (res.ok || res.status === 403) return true;
  throw new Error(`ServiceNow login check failed (${res.status}).`);
}

/**
 * POST /api/login with { userName, password }.
 * Returns { auth }: the Basic credentials the browser sends back as X-SN-Auth on API calls.
 */
export async function handleLogin(request, config) {
  if (!config.instance) return fail(500, 'SN_INSTANCE_URL is not set.');
  if (request.method !== 'POST') return fail(405, 'Method not allowed.');
  const { userName, password } = await request.json().catch(() => ({}));
  if (!userName || !password) return fail(400, 'Enter your user name and password.');

  const auth = basicAuth(userName, password);
  try {
    if (!(await checkPassword(config, auth))) return fail(401, 'Invalid user name or password.');
  } catch (err) {
    return fail(502, err.message);
  }
  return Response.json({ auth });
}

/** Forwards /api/now/<path> to the instance with the Basic credentials from the X-SN-Auth header. */
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
  const authorization = auth && /^Basic \S+$/.test(auth) ? auth : null;
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
  // Shows in DevTools whether credentials reached ServiceNow, without exposing them.
  out.set('x-shopnow-auth', authorization ? 'basic' : 'missing');
  return new Response(res.status === 204 ? null : await res.arrayBuffer(), { status: res.status, headers: out });
}
