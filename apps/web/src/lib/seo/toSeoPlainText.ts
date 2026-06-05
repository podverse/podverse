import { stripAndDecodeHtml } from '@podverse/helpers';

export const toSeoPlainText = (input?: string | null): string => {
  if (!input) {
    return '';
  }

  return stripAndDecodeHtml(input).replace(/\s+/g, ' ').trim();
};
