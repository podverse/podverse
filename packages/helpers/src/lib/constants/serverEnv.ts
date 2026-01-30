/**
 * Server environment values used across Podverse projects.
 * These values control environment-specific behavior (e.g., bypassing free trial restrictions in non-production environments).
 */
export const SERVER_ENV_VALUES = ['prod', 'beta', 'alpha', 'local'] as const;

export type ServerEnv = (typeof SERVER_ENV_VALUES)[number];

/**
 * Validates if a string is a valid server environment value.
 */
export const isValidServerEnv = (value: string): value is ServerEnv => {
  return SERVER_ENV_VALUES.includes(value as ServerEnv);
};
