import { createHash } from 'node:crypto';

import { formatGuidEnclosureUrl } from '@podverse/helpers';

/** 16-byte md5 of the enclosure URL stored on `item.guid_enclosure_url`. */
export const enclosureUrlDigest = (url: string): Buffer => {
  return createHash('md5').update(formatGuidEnclosureUrl(url), 'utf8').digest();
};
