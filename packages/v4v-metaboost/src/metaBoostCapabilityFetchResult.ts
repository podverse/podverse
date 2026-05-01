/** Parsed MetaBoost mb-v1 / mbrss-v1 GET capability (shared shape). */
export type MetaBoostCapabilityFetchResult = {
  messageCharLimit: number;
  termsOfServiceUrl: string;
  /** Public messages endpoint URL when bucket exposes one. */
  publicMessagesUrl: string | null;
  /** Present when optional `sender_guid` query was a valid UUID and the bucket blocks that sender. */
  senderBlocked: boolean;
  /** Server message when blocked; otherwise null. */
  senderBlockMessage: string | null;
  /** Bucket-preferred currency from capability context when provided (threshold snapshots / conversion). */
  preferredCurrency: string | null;
  /** Public bucket conversion (ratio) endpoint URL when provided. */
  conversionEndpointUrl: string | null;
};
