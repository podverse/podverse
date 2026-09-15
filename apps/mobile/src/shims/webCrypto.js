/**
 * Hermes does not provide `globalThis.crypto`. The `uuid` package (playback outbox
 * event ids, push installation ids) calls `crypto.getRandomValues` / `crypto.randomUUID`.
 */

const getRandomValues = (typedArray) => {
  for (let i = 0; i < typedArray.length; i += 1) {
    typedArray[i] = Math.floor(Math.random() * 256);
  }
  return typedArray;
};

const randomUUID = () => {
  const bytes = getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const existing = globalThis.crypto;
if (existing === undefined || typeof existing.getRandomValues !== 'function') {
  globalThis.crypto = {
    getRandomValues,
    randomUUID,
  };
} else if (typeof existing.randomUUID !== 'function') {
  existing.randomUUID = randomUUID;
}
