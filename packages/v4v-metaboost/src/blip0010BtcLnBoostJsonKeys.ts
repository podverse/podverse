/**
 * JSON keys used when encoding the **bLIP-0010 BTC/LN** (keysend TLV) boost payload in Podverse.
 *
 * This is separate from the MetaBoost MB1 HTTP ingest schema ([`Mb1CreateBoostIngestBody`](./mb1CreateBoost.ts));
 * the two protocols are not assumed to share field names.
 */
export const BLIP0010_BTC_LN_BOOST_JSON_KEYS = [
  'value_msat',
  'value_msat_total',
  'timestamp',
  'split',
] as const;

export type Blip0010BtcLnBoostJsonKey = (typeof BLIP0010_BTC_LN_BOOST_JSON_KEYS)[number];
