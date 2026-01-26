/**
 * Type-safe accessor for CSS module class names.
 * Eliminates the need for `as keyof typeof styles` assertions.
 */
export function cssClass<T extends Record<string, string>>(
  styles: T,
  key: keyof T,
): string {
  const className = styles[key];
  if (!className) {
    throw new Error(`CSS class "${String(key)}" not found in styles object`);
  }
  return className;
}
