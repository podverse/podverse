const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Device-local UUID. Hermes has no `crypto` global, so this does not call `uuid` / Web Crypto.
 */
export const createUuid = (): string => {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    const value = Math.floor(Math.random() * 256);
    if (i === 6) {
      bytes[i] = (value & 0x0f) | 0x40;
    } else if (i === 8) {
      bytes[i] = (value & 0x3f) | 0x80;
    } else {
      bytes[i] = value;
    }
  }
  const hex = hexFromBytes(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
