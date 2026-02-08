/**
 * Normalize transcript response data to a string for consistent API responses.
 * Used by both item transcript and add-by-RSS chapters-transcript so the client
 * always receives a value safe for getTranscriptRowsFromTranscriptString.
 */
export function normalizeTranscriptResponseData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    !(data instanceof ArrayBuffer) &&
    !Buffer.isBuffer(data)
  ) {
    return JSON.stringify(data);
  }
  return '';
}
