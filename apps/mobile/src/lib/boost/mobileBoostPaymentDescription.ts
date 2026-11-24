/** Trimmed message, or `${appName} boost` when the message is blank. */
export function mobileBoostPaymentDescription(message: string, appName: string): string {
  const trimmed = message.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${appName} boost`;
}
