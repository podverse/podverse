/**
 * Parse a JSON payload persisted by this app back into its typed shape. Values are DTOs the app
 * itself serialized, so a single documented assertion is acceptable here (see avoid-type-assertions
 * rule). Returns `null` on malformed / empty payloads so callers can fall back gracefully.
 */
export const safeJsonParse = <T>(raw: string): T | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || parsed === undefined) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
};
