/**
 * Assertion-free readers for axios-shaped request errors
 * (`{ response?: { status?: number; data?: { code?: string } } }`).
 */

export const getErrorStatusCode = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const response = Reflect.get(error, 'response');
  if (typeof response !== 'object' || response === null) {
    return null;
  }

  const status = Reflect.get(response, 'status');
  if (typeof status !== 'number') {
    return null;
  }

  return status;
};

export const getErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const response = Reflect.get(error, 'response');
  if (typeof response !== 'object' || response === null) {
    return null;
  }

  const data = Reflect.get(response, 'data');
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const code = Reflect.get(data, 'code');
  if (typeof code !== 'string') {
    return null;
  }

  return code;
};

export const isUnauthorizedError = (error: unknown): boolean => {
  return getErrorStatusCode(error) === 401;
};
