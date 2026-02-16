import crypto from 'crypto';

export const getMd5Hash = (data: unknown): string => {
  const parsedFeedString = JSON.stringify(data);
  return crypto.createHash('md5').update(parsedFeedString).digest('hex');
};

/**
 * Returns the SHA-256 hash of the input as a hex string.
 * Accepts string, Buffer, or Uint8Array (e.g. for checksums of binary bodies).
 */
export const sha256Hex = (data: string | Buffer | Uint8Array): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};
