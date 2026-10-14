import {
  clearLocalAuth, getLocalAuth, hasSessionToken, request, sanitizeQueryValue, setLocalAuth, tableApi,
} from './BaseService';

const USER_FIELDS = 'sys_id,user_name,first_name,last_name,name,email';

const mapUser = (r) => ({
  id: r.sys_id,
  userName: r.user_name,
  firstName: r.first_name || r.name || r.user_name,
  name: r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.user_name,
  email: r.email,
});

async function findUserByName(userName) {
  const { records } = await tableApi.list('sys_user', {
    query: `user_name=${sanitizeQueryValue(userName)}`,
    fields: USER_FIELDS,
    limit: 1,
  });
  if (!records.length) throw new Error(`User "${userName}" cannot be read. Check the account can read sys_user.`);
  return mapUser(records[0]);
}

/** Sign in through /api/login (OAuth password grant, or Basic auth when no OAuth client is set up). */
export async function login(userName, password) {
  const { data } = await request('/api/login', { method: 'POST', body: { userName, password }, auth: false });
  setLocalAuth({ ...data, userName }); // throws ApiError(401) above on bad credentials
  try {
    return await findUserByName(userName);
  } catch (err) {
    clearLocalAuth();
    throw err;
  }
}

/** Resolves the signed-in user, or null when nobody is signed in. */
export async function getCurrentUser() {
  const session = getLocalAuth();
  // Use the user name from our own session, not gs.getUser(): session cookies could belong to another account.
  if (session) return findUserByName(session.userName);
  if (!hasSessionToken()) return null;

  const { records } = await tableApi.list('sys_user', {
    query: 'sys_id=javascript:gs.getUserID()',
    fields: USER_FIELDS,
    limit: 1,
  });
  return records.length ? mapUser(records[0]) : null;
}

export function logout() {
  const usedLoginForm = Boolean(getLocalAuth());
  clearLocalAuth();
  if (!usedLoginForm && hasSessionToken()) window.location.href = '/logout.do';
}
