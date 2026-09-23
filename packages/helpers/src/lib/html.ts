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

/**
 * Plain text for a preview that will be clamped to a line or two anyway.
 *
 * Converting a whole feed description to strip it back to a preview is the expensive part: show
 * notes run to kilobytes of markup, and a list renders dozens of them per load. Slicing the source
 * first bounds that work to the same order as what is actually displayed. Use `htmlToPlainText`
 * wherever the full text can be read.
 */
export function htmlToPlainTextPreview(input?: string, maxChars = 400): string {
  if (!input) {
    return '';
  }

  const sliceBudget = maxChars * 6;
  if (input.length < sliceBudget) {
    return htmlToPlainText(input);
  }

  const sliced = input.slice(0, sliceBudget).replace(/<[^>]*$/, '');
  const plain = htmlToPlainText(sliced);
  if (plain.length <= maxChars) {
    return plain;
  }

  const truncated = plain.slice(0, maxChars);
  const lastWhitespace = truncated.search(/\s+\S*$/);
  if (lastWhitespace === -1) {
    return truncated;
  }

  return truncated.slice(0, lastWhitespace);
}
