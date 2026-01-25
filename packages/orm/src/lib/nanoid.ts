import { customAlphabet } from 'nanoid';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRandomIdText(): string {
  const length = 10;
  const safeLength = Math.max(9, Math.min(length, 15));
  const nanoid = customAlphabet(ALPHABET, safeLength);
  return nanoid();
}
