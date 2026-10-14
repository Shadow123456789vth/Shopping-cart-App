const LOCAL_AUTH_KEY = 'local_auth';

// Set by ServiceNow when the app is served from the instance (UI Page / portal).
export const hasSessionToken = () => typeof window.g_ck === 'string' && window.g_ck.length > 0;

export function getLocalAuth() {
  if (window.__localAuth) return window.__localAuth;
  try {
    return sessionStorage.getItem(LOCAL_AUTH_KEY);
  } catch {
    return null;
  }
}

export function setLocalAuth(token) {
  window.__localAuth = token;
  try {
    sessionStorage.setItem(LOCAL_AUTH_KEY, token);
  } catch {
    /* storage unavailable: token lives in memory for this tab */
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

// UTF-8 safe base64 (plain btoa throws on non-Latin1 passwords).
export function toBase64(str) {
  let binary = '';
  new TextEncoder().encode(str).forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function fromBase64(b64) {
  const binary = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function buildHeaders(authToken) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const token = authToken || getLocalAuth();
  if (token) {
    // Signed in with the login form. In dev the Vite proxy turns X-Local-Auth into Authorization: Basic;
    // a build served from the instance sends Basic auth to the same origin directly.
    if (import.meta.env.DEV) headers['X-Local-Auth'] = token;
    else headers.Authorization = `Basic ${token}`;
  } else if (hasSessionToken()) {
    headers['X-UserToken'] = window.g_ck;
  }
  return headers;
}

export async function request(path, { method = 'GET', query, body, authToken } = {}) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  const url = params.toString() ? `${path}?${params}` : path;

  const res = await fetch(url, {
    method,
    headers: buildHeaders(authToken),
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });

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
  async list(table, { query, fields, limit, offset, authToken } = {}) {
    const { data, headers } = await request(`${TABLE_API}/${table}`, {
      authToken,
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
