import { setPartytimeLogger } from 'podverse-partytime/core';

const MARKUP_DOCUMENT = /^\uFEFF?\s*</;

let installed = false;

/** True when a log argument is a markup document rather than a short diagnostic. */
export function isResponseBodyLogArgument(value: unknown): boolean {
  return typeof value === 'string' && MARKUP_DOCUMENT.test(value) && value.includes('>');
}

export function omitResponseBodyLogArguments(args: readonly unknown[]): unknown[] {
  return args.filter((arg) => !isResponseBodyLogArgument(arg));
}

/**
 * Partytime logs an invalid document as its own warning argument. Drop those arguments so a
 * page body never reaches the console. Short warnings stay.
 */
export function installPartytimeResponseBodyLogFilter(): void {
  if (installed || typeof setPartytimeLogger !== 'function') {
    return;
  }

  const warn = (...args: unknown[]): void => {
    const kept = omitResponseBodyLogArguments(args);
    if (kept.length === 0) {
      return;
    }
    console.warn(...kept);
  };
  const error = (...args: unknown[]): void => {
    const kept = omitResponseBodyLogArguments(args);
    if (kept.length === 0) {
      return;
    }
    console.error(...kept);
  };

  setPartytimeLogger({
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn,
    error,
  });
  installed = true;
}
