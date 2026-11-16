import { decodeHtmlEntities, readDescriptionDocument } from '@podverse/helpers';

export const toSeoPlainText = (input?: string | null): string => {
  if (!input) {
    return '';
  }

  return decodeHtmlEntities(readDescriptionDocument(input).plain).replace(/\s+/g, ' ').trim();
};
