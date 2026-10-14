const LOCAL_AUTH_KEY = 'local_auth';

// Set by ServiceNow when the app is served from the instance (UI Page / portal).
export const hasSessionToken = () => typeof window.g_ck === 'string' && window.g_ck.length > 0;

/** Login-form session: { auth: 'Bearer …' | 'Basic …', refreshToken?, userName }. */
export function getLocalAuth() {
  if (window.__localAuth) return window.__localAuth;
  try {
    const raw = sessionStorage.getItem(LOCAL_AUTH_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session?.auth ? session : null;
  } catch {
    return null; // storage unavailable, or a token from an older version of the app
  }
}

export function setLocalAuth(session) {
  window.__localAuth = session;
  try {
    sessionStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable: session lives in memory for this tab */
  }
}

export function clearLocalAuth() {
  delete window.__localAuth;
  try {
    sessionStorage.removeItem(LOCAL_AUTH_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function buildHeaders(useAuth) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (!useAuth) return headers;
  const session = getLocalAuth();
  if (session) {
    // The proxy (server/servicenow.js) sends this on as the Authorization header.
    headers['X-SN-Auth'] = session.auth;
  } else if (hasSessionToken()) {
    headers['X-UserToken'] = window.g_ck;
  }
  return headers;
}

let refreshing = null;

// Swap an expired OAuth access token for a new one. Concurrent 401s share one refresh.
async function refreshSession() {
  const session = getLocalAuth();
  if (!session?.refreshToken) return false;
  refreshing ??= fetch('/api/login', {
    method: 'POST',
    headers: buildHeaders(false),
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const data = await res.json();
      setLocalAuth({ ...session, auth: data.auth, refreshToken: data.refreshToken || session.refreshToken });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function request(path, { method = 'GET', query, body, auth = true } = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const url = params.toString() ? `${path}?${params}` : path;

  const send = () => fetch(url, {
    method,
    headers: buildHeaders(auth),
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  let res = await send();
  if (res.status === 401 && auth && (await refreshSession())) res = await send();

  const text = res.status === 204 ? '' : await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = data?.error?.message || (res.status === 401 ? 'Invalid credentials' : res.statusText || 'Request failed');
    throw new ApiError(message, res.status, data?.error?.detail);
  }
  return { data, headers: res.headers };
}

// Strip characters that would break out of an encoded-query condition.
export const sanitizeQueryValue = (value) => String(value).replace(/[\^=]/g, ' ').trim();

const TABLE_API = '/api/now/table';
const COMMON = { sysparm_exclude_reference_link: 'true', sysparm_display_value: 'false' };

export const tableApi = {
  async list(table, { query, fields, limit, offset } = {}) {
    const { data, headers } = await request(`${TABLE_API}/${table}`, {
      query: {
        ...COMMON,
        sysparm_query: query,
        sysparm_fields: fields,
        sysparm_limit: limit,
        sysparm_offset: offset,
      },
    });
    return { records: data?.result || [], total: parseInt(headers.get('X-Total-Count') || '0', 10) };
  },

  async get(table, sysId, { fields } = {}) {
    const { data } = await request(`${TABLE_API}/${table}/${sysId}`, {
      query: { ...COMMON, sysparm_fields: fields },
    });
    return data?.result;
  },

  async create(table, record, { fields } = {}) {
    const { data } = await request(`${TABLE_API}/${table}`, {
      method: 'POST',
      body: record,
      query: { ...COMMON, sysparm_fields: fields },
    });
    return data?.result;
  },

  async update(table, sysId, patch, { fields } = {}) {
    const { data } = await request(`${TABLE_API}/${table}/${sysId}`, {
      method: 'PATCH',
      body: patch,
      query: { ...COMMON, sysparm_fields: fields },
    });
    return data?.result;
  },

  async remove(table, sysId) {
    await request(`${TABLE_API}/${table}/${sysId}`, { method: 'DELETE' });
  },
};
