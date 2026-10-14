import {
  clearLocalAuth, fromBase64, getLocalAuth, hasSessionToken, sanitizeQueryValue, setLocalAuth, tableApi, toBase64,
} from './BaseService';

const USER_FIELDS = 'sys_id,user_name,first_name,last_name,name,email';

const mapUser = (r) => ({
  id: r.sys_id,
  userName: r.user_name,
  firstName: r.first_name || r.name || r.user_name,
  name: r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.user_name,
  email: r.email,
});

async function findUserByName(userName, authToken) {
  const { records } = await tableApi.list('sys_user', {
    query: `user_name=${sanitizeQueryValue(userName)}`,
    fields: USER_FIELDS,
    limit: 1,
    authToken,
  });
  if (!records.length) throw new Error(`User "${userName}" cannot be read. Check the account can read sys_user.`);
  return mapUser(records[0]);
}

/** Validate ServiceNow credentials with a test call, then keep the token for this tab. */
export async function loginLocal(userName, password) {
  const token = toBase64(`${userName}:${password}`);
  const user = await findUserByName(userName, token); // throws ApiError(401) on bad credentials
  setLocalAuth(token);
  return user;
}

/** Resolves the signed-in user, or null when nobody is signed in. */
export async function getCurrentUser() {
  const token = getLocalAuth();
  if (token) {
    // Use the user name from our own token, not gs.getUser(): session cookies could belong to another account.
    const decoded = fromBase64(token);
    return findUserByName(decoded.slice(0, decoded.indexOf(':')));
  }
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
