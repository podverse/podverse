function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '';
}

/**
 * True when an outbound HTTP failure is likely TLS/protocol mismatch (bad upstream endpoint),
 * not an application-level HTTP response.
 */
export function isTlsOrProtocolError(error: unknown): boolean {
  const message = errorMessage(error).toLowerCase();
  if (message.length === 0) {
    return false;
  }

  return (
    message.includes('eproto') ||
    message.includes('wrong version number') ||
    message.includes('ssl routines') ||
    message.includes('tls_validate_record_header') ||
    message.includes('unsupported protocol')
  );
}
