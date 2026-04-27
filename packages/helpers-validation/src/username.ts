const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) {
    return false;
  }
  return USERNAME_REGEX.test(trimmed);
}

export function getUsernameErrorKey(username: string): string | undefined {
  if (!username) {
    return 'invalid_username';
  }
  return validateUsername(username) ? undefined : 'invalid_username';
}
