const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Device-local UUID. Hermes has no `crypto` global, so this does not call `uuid` / Web Crypto.
 */
export const createUuid = (): string => {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = hexFromBytes(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
