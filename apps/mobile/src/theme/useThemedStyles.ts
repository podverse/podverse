import { StyleSheet } from 'react-native';

import { useTheme } from './useTheme';

export type ThemedStylesTheme = ReturnType<typeof useTheme>;

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

type ThemedStylesFactory<T extends NamedStyles<T>> = (theme: ThemedStylesTheme) => T;

const themedStylesCache = new WeakMap<object, WeakMap<object, object>>();

const isCachedStyles = <T extends NamedStyles<T>>(value: object | undefined): value is T => {
  return value !== undefined;
};

/**
 * Build a component's stylesheet once per theme and share it across every instance.
 *
 * `useMemo` caches per instance, so a component that mounts once per list row builds an identical
 * stylesheet for each row. This caches on the style factory and the theme object, so the first row
 * to mount pays and the rest read. Switching theme builds one new stylesheet per factory.
 *
 * The factory must be a stable module-scope function. Passing an inline arrow defeats the cache —
 * a new factory identity is a new cache entry every render. There is no extra cache key; a per-row
 * key would grow without bound.
 */
export function resolveThemedStyles<T extends NamedStyles<T>>(
  factory: ThemedStylesFactory<T>,
  theme: ThemedStylesTheme
): T {
  let byTheme = themedStylesCache.get(factory);
  if (byTheme === undefined) {
    byTheme = new WeakMap();
    themedStylesCache.set(factory, byTheme);
  }

  const cached = byTheme.get(theme);
  if (isCachedStyles<T>(cached)) {
    return cached;
  }

  const created = StyleSheet.create(factory(theme));
  byTheme.set(theme, created);
  return created;
}

export const useThemedStyles = <T extends NamedStyles<T>>(factory: ThemedStylesFactory<T>): T => {
  const theme = useTheme();
  return resolveThemedStyles(factory, theme);
};
