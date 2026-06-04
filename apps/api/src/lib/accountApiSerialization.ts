import { resolveSharableStatusId } from './resolveSharableStatusId.js';

type AccountWireInput = {
  sharable_status_id?: number | null;
  sharable_status?: unknown;
  account?: AccountWireInput;
};

/**
 * Serializes account entities for API responses: canonical `sharable_status_id` only,
 * never nested `sharable_status` relation objects.
 */
export function accountToJson<T extends AccountWireInput>(account: T): Omit<T, 'sharable_status'> {
  const { sharable_status: _sharableStatus, account: nestedAccount, ...rest } = account;
  const sharableStatusId = resolveSharableStatusId(account);

  const result = { ...rest } as Omit<T, 'sharable_status'>;

  if (sharableStatusId !== undefined) {
    Object.assign(result, { sharable_status_id: sharableStatusId });
  }

  if (nestedAccount !== null && nestedAccount !== undefined) {
    Object.assign(result, { account: accountToJson(nestedAccount) });
  }

  return result;
}

export function accountsToJson<T extends AccountWireInput>(
  accounts: T[]
): Array<Omit<T, 'sharable_status'>> {
  return accounts.map(accountToJson);
}
