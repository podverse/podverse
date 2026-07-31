import he from 'he';

function stripHtmlTags(input?: string): string {
  if (!input) {
    return '';
  }
  return input.replace(/<[^>]*>/g, '');
}

export function decodeHtmlEntities(input?: string): string {
  if (!input) {
    return '';
  }
  return he.decode(input);
}

export function stripAndDecodeHtml(input?: string): string {
  return stripHtmlTags(decodeHtmlEntities(input));
}

/** Convert HTML-rich descriptions to normalized plain text for compact app surfaces. */
export function htmlToPlainText(input?: string): string {
  if (!input) {
    return '';
  }

  return decodeHtmlEntities(
    input
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}
