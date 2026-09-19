export type CopyMarkdownBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; spans: CopyMarkdownInlineSpan[] }
  | { type: 'list'; items: CopyMarkdownInlineSpan[][] };

export type CopyMarkdownInlineSpan =
  { type: 'text'; text: string } | { type: 'link'; text: string; href: string };

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export function getCopyMarkdownIntro(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const headingMatch = /(?:^|\n)# /.exec(normalized);
  if (headingMatch === null || headingMatch.index === undefined) {
    return normalized.trim();
  }
  const prefix = normalized.slice(0, headingMatch.index).trim();
  if (prefix === '') {
    return normalized.trim();
  }
  return prefix;
}

export function parseCopyMarkdown(markdown: string): CopyMarkdownBlock[] {
  const trimmed = markdown.replace(/\r\n/g, '\n').trim();
  if (trimmed === '') {
    return [];
  }

  const lines = trimmed.split('\n');
  const blocks: CopyMarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }
    const text = paragraphLines.join(' ').trim();
    paragraphLines = [];
    if (text === '') {
      return;
    }
    blocks.push({ type: 'paragraph', spans: parseInlineSpans(text) });
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push({
      type: 'list',
      items: listItems.map((item) => parseInlineSpans(item)),
    });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseInlineSpans(text: string): CopyMarkdownInlineSpan[] {
  const spans: CopyMarkdownInlineSpan[] = [];
  let cursor = 0;
  LINK_PATTERN.lastIndex = 0;
  let match = LINK_PATTERN.exec(text);
  while (match !== null) {
    const matchIndex = match.index;
    if (matchIndex > cursor) {
      spans.push({ type: 'text', text: text.slice(cursor, matchIndex) });
    }
    spans.push({ type: 'link', text: match[1] ?? '', href: match[2] ?? '' });
    cursor = LINK_PATTERN.lastIndex;
    match = LINK_PATTERN.exec(text);
  }
  if (cursor < text.length) {
    spans.push({ type: 'text', text: text.slice(cursor) });
  }
  if (spans.length === 0) {
    return [{ type: 'text', text }];
  }
  return spans;
}
