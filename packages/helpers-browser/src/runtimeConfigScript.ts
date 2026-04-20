/**
 * Inline runtime config serialization for `<script dangerouslySetInnerHTML>` injection.
 * Escapes `<` so JSON cannot break out of the script element.
 */

export function serializeRuntimeConfig(config: unknown): string {
  return JSON.stringify(config).replace(/</g, '\\u003c');
}

/**
 * @param globalThisProperty - Property name assigned on globalThis (e.g. __PODVERSE_RUNTIME_CONFIG__)
 */
export function buildRuntimeConfigScript(config: unknown, globalThisProperty: string): string {
  return `globalThis[${JSON.stringify(globalThisProperty)}] = ${serializeRuntimeConfig(config)};`;
}
