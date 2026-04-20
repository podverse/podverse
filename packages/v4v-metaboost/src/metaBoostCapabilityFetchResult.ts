/** Parsed MetaBoost mb-v1 / mbrss-v1 GET capability (shared shape). */
export type MetaBoostCapabilityFetchResult = {
  messageCharLimit: number;
  termsOfServiceUrl: string;
  /** Present when optional `sender_guid` query was a valid UUID and the bucket blocks that sender. */
  senderBlocked: boolean;
  /** Server message when blocked; otherwise null. */
  senderBlockMessage: string | null;
  /** Bucket-preferred threshold compare currency from capability context when provided. */
  preferredCurrency: string | null;
  /** Bucket threshold minimum in integer minor units when provided. */
  minimumMessageAmountMinor: number | null;
  /** Public bucket conversion endpoint URL when provided. */
  conversionEndpointUrl: string | null;
};
