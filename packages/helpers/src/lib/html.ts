import { decode } from 'he';

function stripHtmlTags(input?: string): string {
  if (!input) {return '';}
  return input.replace(/<[^>]*>/g, '');
}

export function decodeHtmlEntities(input?: string): string {
  if (!input) {return '';}
  return decode(input);
}

export function stripAndDecodeHtml(input?: string): string {
  return stripHtmlTags(decodeHtmlEntities(input));
}
