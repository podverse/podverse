import { isValidUUID } from '@podverse/helpers';

const isNumericSegment = (segment: string): boolean => /^\d+$/.test(segment);

const isDynamicPathSegment = (segment: string): boolean => {
  return isValidUUID(segment) || isNumericSegment(segment);
};

/**
 * Collapse dynamic URL segments to `:id` to keep http.route cardinality bounded.
 */
export const normalizePathForMetricLabel = (pathname: string): string => {
  const trimmed = pathname.trim();
  if (trimmed === '' || trimmed === '/') {
    return '/';
  }

  const segments = trimmed.split('/').filter((segment) => segment.length > 0);
  const normalized = segments.map((segment) => {
    if (isDynamicPathSegment(segment)) {
      return ':id';
    }
    return segment;
  });

  return `/${normalized.join('/')}`;
};
