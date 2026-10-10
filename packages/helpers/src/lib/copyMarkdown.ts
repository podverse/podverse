export type CopyMarkdownSurface = 'web' | 'mobile';

export type CopyMarkdownImageKey = 'app_store' | 'google_play' | 'f_droid';

export type CopyMarkdownComponentKey = 'feature_comparison';

export type CopyMarkdownHeadingLevel = 1 | 2 | 3;

export type CopyMarkdownBlock =
  | { type: 'heading'; level: CopyMarkdownHeadingLevel; text: string }
  | { type: 'paragraph'; spans: CopyMarkdownInlineSpan[] }
  | { type: 'list'; items: CopyMarkdownInlineSpan[][] }
  | { type: 'image'; key: CopyMarkdownImageKey; href: string }
  | { type: 'component'; key: CopyMarkdownComponentKey };

export type CopyMarkdownInlineSpan =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'link'; text: string; href: string };

export type ParseCopyMarkdownOptions = {
  surface?: CopyMarkdownSurface;
};

const INLINE_TOKEN_PATTERN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

const HEADING_PATTERN = /^(#{1,3}) (.+)$/;

const IMAGE_DIRECTIVE_PATTERN =
  /^\{\{image:(app_store|google_play|f_droid)\}\}\((https?:\/\/[^)]+)\)$/;

const SURFACE_OPEN_PATTERN = /^\{\{(web|mobile)\}\}$/;
const SURFACE_CLOSE_PATTERN = /^\{\{\/(web|mobile)\}\}$/;
const FEATURE_COMPARISON_DIRECTIVE = '{{feature_comparison}}';
const DIRECTIVE_LINE_PATTERN = /^\{\{[^}]+\}\}(?:\([^)]*\))?$/;

function isCopyMarkdownImageKey(value: string): value is CopyMarkdownImageKey {
  return value === 'app_store' || value === 'google_play' || value === 'f_droid';
}

function isCopyMarkdownSurface(value: string): value is CopyMarkdownSurface {
  return value === 'web' || value === 'mobile';
}

function isCopyMarkdownHeadingLevel(value: number): value is CopyMarkdownHeadingLevel {
  return value === 1 || value === 2 || value === 3;
}

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

export function parseCopyMarkdown(
  markdown: string,
  options: ParseCopyMarkdownOptions = {}
): CopyMarkdownBlock[] {
  const trimmed = markdown.replace(/\r\n/g, '\n').trim();
  if (trimmed === '') {
    return [];
  }

  const lines = trimmed.split('\n');
  const blocks: CopyMarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let skipSurface: CopyMarkdownSurface | null = null;

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

    const surfaceOpen = SURFACE_OPEN_PATTERN.exec(line);
    if (surfaceOpen !== null) {
      flushParagraph();
      flushList();
      const regionSurface = surfaceOpen[1];
      if (
        regionSurface !== undefined &&
        isCopyMarkdownSurface(regionSurface) &&
        options.surface !== undefined &&
        options.surface !== regionSurface
      ) {
        skipSurface = regionSurface;
      }
      continue;
    }

    const surfaceClose = SURFACE_CLOSE_PATTERN.exec(line);
    if (surfaceClose !== null) {
      flushParagraph();
      flushList();
      const closedSurface = surfaceClose[1];
      if (
        closedSurface !== undefined &&
        isCopyMarkdownSurface(closedSurface) &&
        skipSurface === closedSurface
      ) {
        skipSurface = null;
      }
      continue;
    }

    if (skipSurface !== null) {
      continue;
    }

    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (line === FEATURE_COMPARISON_DIRECTIVE) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'component', key: 'feature_comparison' });
      continue;
    }

    const imageMatch = IMAGE_DIRECTIVE_PATTERN.exec(line);
    if (imageMatch !== null) {
      flushParagraph();
      flushList();
      const key = imageMatch[1];
      const href = imageMatch[2];
      if (key !== undefined && href !== undefined && isCopyMarkdownImageKey(key)) {
        blocks.push({
          type: 'image',
          key,
          href,
        });
      }
      continue;
    }

    if (DIRECTIVE_LINE_PATTERN.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch !== null) {
      const hashes = headingMatch[1];
      const headingText = headingMatch[2];
      if (hashes !== undefined && headingText !== undefined) {
        const level = hashes.length;
        if (isCopyMarkdownHeadingLevel(level)) {
          flushParagraph();
          flushList();
          blocks.push({ type: 'heading', level, text: headingText.trim() });
          continue;
        }
      }
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
  INLINE_TOKEN_PATTERN.lastIndex = 0;
  let match = INLINE_TOKEN_PATTERN.exec(text);
  while (match !== null) {
    const matchIndex = match.index;
    if (matchIndex > cursor) {
      spans.push({ type: 'text', text: text.slice(cursor, matchIndex) });
    }
    const strongText = match[1];
    const linkText = match[2];
    const linkHref = match[3];
    if (strongText !== undefined) {
      spans.push({ type: 'strong', text: strongText });
    } else if (linkText !== undefined && linkHref !== undefined) {
      spans.push({ type: 'link', text: linkText, href: linkHref });
    }
    cursor = INLINE_TOKEN_PATTERN.lastIndex;
    match = INLINE_TOKEN_PATTERN.exec(text);
  }
  if (cursor < text.length) {
    spans.push({ type: 'text', text: text.slice(cursor) });
  }
  if (spans.length === 0) {
    return [{ type: 'text', text }];
  }
  return spans;
}
