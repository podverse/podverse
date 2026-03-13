const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ID_TEXT_LENGTH = 10;

const getRandomValues = (length: number): Uint8Array => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return values;
  }

  const values = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    values[i] = Math.floor(Math.random() * 256);
  }
  return values;
};

export const createAddByRSSIdText = (): string => {
  const values = getRandomValues(ID_TEXT_LENGTH);
  let result = '';

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i] ?? 0;
    result += ALPHABET[value % ALPHABET.length];
  }

  return result;
};

export const createAddByRSSId = (idText: string): number => {
  let hash = 0;
  for (let i = 0; i < idText.length; i += 1) {
    hash = (hash * 31 + idText.charCodeAt(i)) >>> 0;
  }
  return hash;
};
