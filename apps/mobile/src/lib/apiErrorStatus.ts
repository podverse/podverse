const hasStatus = (value: unknown): value is { status: number } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'number'
  );
};

/** HTTP status on a helpers-requests / axios failure, when the server answered. */
export const getApiErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return null;
  }

  return hasStatus(error.response) ? error.response.status : null;
};

export const isApiNotFoundError = (error: unknown): boolean => {
  return getApiErrorStatus(error) === 404;
};

/**
 * Run a list fetch and treat a missing parent or missing nested resource as an empty page.
 *
 * Episode clips, chapters, official clips, and transcripts 404 when the catalog row is gone or
 * never existed; that is an empty pane, not a failed screen.
 */
export const emptyIfNotFound = async <T>(run: () => Promise<T>, empty: T): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isApiNotFoundError(error)) {
      return empty;
    }
    throw error;
  }
};
