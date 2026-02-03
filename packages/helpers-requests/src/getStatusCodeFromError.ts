export const getStatusCodeFromError = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const maybeStatusCode = (error as { statusCode?: number }).statusCode;
  const maybeStatus = (error as { status?: number }).status;
  if (typeof maybeStatusCode === 'number') {
    return maybeStatusCode;
  }
  if (typeof maybeStatus === 'number') {
    return maybeStatus;
  }
  return null;
};
