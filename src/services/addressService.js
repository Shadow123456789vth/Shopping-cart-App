import { TABLES } from '../config';
import { tableApi } from './BaseService';
import { toBool } from '../utils/format';

const ADDRESS_FIELDS = 'sys_id,u_full_name,u_phone,u_line1,u_line2,u_city,u_state,u_postal_code,u_country,u_is_default';

const mapAddress = (r) => ({
  id: r.sys_id,
  fullName: r.u_full_name,
  phone: r.u_phone,
  line1: r.u_line1,
  line2: r.u_line2,
  city: r.u_city,
  state: r.u_state,
  postalCode: r.u_postal_code,
  country: r.u_country,
  isDefault: toBool(r.u_is_default),
});

const toRecord = (a) => ({
  u_full_name: a.fullName,
  u_phone: a.phone,
  u_line1: a.line1,
  u_line2: a.line2,
  u_city: a.city,
  u_state: a.state,
  u_postal_code: a.postalCode,
  u_country: a.country,
  u_is_default: a.isDefault ? 'true' : 'false',
});

export async function listAddresses(userId) {
  const { records } = await tableApi.list(TABLES.address, {
    query: `u_user=${userId}^ORDERBYDESCu_is_default^ORDERBYDESCsys_created_on`,
    fields: ADDRESS_FIELDS,
  });
  return records.map(mapAddress);
}

export async function createAddress(userId, address, existing = []) {
  if (address.isDefault) {
    await Promise.all(existing.filter((a) => a.isDefault).map((a) => tableApi.update(TABLES.address, a.id, { u_is_default: 'false' })));
  }
  const created = await tableApi.create(TABLES.address, { ...toRecord(address), u_user: userId }, { fields: ADDRESS_FIELDS });
  return mapAddress(created);
}
