import { getWebOrigin } from '../../config';

export const buildAbsoluteWebUrl = (pathname: string): string => {
  const normalizedPath = `/${pathname.replace(/^\/+/, '')}`;
  return new URL(normalizedPath, getWebOrigin()).toString();
};
