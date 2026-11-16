import type { DescriptionNode } from './descriptionDocument.js';
import { htmlToPlainTextPreview } from './html.js';

/**
 * Stored channel and item descriptions are this markdown.
 * The tree is the About / Summary allowlist: paragraphs, headings, lists, bold, italic,
 * underline, links, and line breaks. Underline is the only raw tag, written as `<u>`.
 */

const HTML_TAG_OTHER_THAN_UNDERLINE = /<(?!\/?u>)[A-Za-z/]/;

const isAllowedLinkHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:');
};

const isEscaped = (source: string, index: number): boolean => {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) {
    slashes += 1;
  }
  return slashes % 2 === 1;
};

const findMarker = (source: string, from: number, end: number, marker: string): number | null => {
  const last = end - marker.length;
  for (let index = from; index <= last; index += 1) {
    if (source.startsWith(marker, index) && !isEscaped(source, index)) {
      return index;
    }
  }
  return null;
};

const findSingleStar = (source: string, from: number, end: number): number | null => {
  for (let index = from; index < end; index += 1) {
    if (source[index] !== '*' || isEscaped(source, index)) {
      continue;
    }
    if (index + 1 < end && source[index + 1] === '*') {
      index += 1;
      continue;
    }
    return index;
  }
  return null;
};

const findClosingUnderline = (source: string, from: number, end: number): number | null => {
  let depth = 1;
  for (let index = from; index < end; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source.startsWith('<u>', index)) {
      depth += 1;
      index += 2;
      continue;
    }
    if (source.startsWith('</u>', index)) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      index += 3;
    }
  }
  return null;
};

const headingNode = (level: number, children: DescriptionNode[]): DescriptionNode | null => {
  if (level === 1) return { kind: 'h1', children };
  if (level === 2) return { kind: 'h2', children };
  if (level === 3) return { kind: 'h3', children };
  if (level === 4) return { kind: 'h4', children };
  if (level === 5) return { kind: 'h5', children };
  if (level === 6) return { kind: 'h6', children };
  return null;
};

type InlineParse = { nodes: DescriptionNode[]; index: number };

const parseInlineRange = (source: string, start: number, end: number): InlineParse | null => {
  const nodes: DescriptionNode[] = [];
  let text = '';
  let index = start;

  const flush = (): void => {
    if (text.length === 0) {
      return;
    }
    nodes.push({ kind: 'text', text });
    text = '';
  };

  while (index < end) {
    const ch = source[index];
    if (ch === '\\') {
      if (index + 1 >= end) {
        return null;
      }
      text += source[index + 1];
      index += 2;
      continue;
    }
    if (ch === '\n') {
      flush();
      nodes.push({ kind: 'br' });
      index += 1;
      continue;
    }
    if (ch === '<') {
      if (!source.startsWith('<u>', index)) {
        return null;
      }
      const close = findClosingUnderline(source, index + 3, end);
      if (close === null) {
        return null;
      }
      flush();
      const inner = parseInlineRange(source, index + 3, close);
      if (inner === null || inner.index !== close) {
        return null;
      }
      if (inner.nodes.length > 0) {
        nodes.push({ kind: 'u', children: inner.nodes });
      }
      index = close + 4;
      continue;
    }
    if (ch === '*') {
      if (source.startsWith('**', index)) {
        const close = findMarker(source, index + 2, end, '**');
        if (close === null) {
          return null;
        }
        flush();
        const inner = parseInlineRange(source, index + 2, close);
        if (inner === null || inner.index !== close) {
          return null;
        }
        if (inner.nodes.length > 0) {
          nodes.push({ kind: 'strong', children: inner.nodes });
        }
        index = close + 2;
        continue;
      }
      const close = findSingleStar(source, index + 1, end);
      if (close === null) {
        return null;
      }
      flush();
      const inner = parseInlineRange(source, index + 1, close);
      if (inner === null || inner.index !== close) {
        return null;
      }
      if (inner.nodes.length > 0) {
        nodes.push({ kind: 'em', children: inner.nodes });
      }
      index = close + 1;
      continue;
    }
    if (ch === '[') {
      const labelEnd = findMarker(source, index + 1, end, '](');
      if (labelEnd === null) {
        return null;
      }
      const hrefEnd = findMarker(source, labelEnd + 2, end, ')');
      if (hrefEnd === null) {
        return null;
      }
      flush();
      const label = parseInlineRange(source, index + 1, labelEnd);
      if (label === null || label.index !== labelEnd || label.nodes.length === 0) {
        return null;
      }
      const href = unescapeLiteral(source.slice(labelEnd + 2, hrefEnd));
      if (!isAllowedLinkHref(href)) {
        return null;
      }
      nodes.push({ kind: 'a', href, children: label.nodes });
      index = hrefEnd + 1;
      continue;
    }
    if (ch === ']' || ch === '>') {
      return null;
    }
    text += ch;
    index += 1;
  }

  flush();
  return { nodes, index };
};

const unescapeLiteral = (value: string): string => {
  let out = '';
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    if (ch === '\\' && index + 1 < value.length) {
      out += value[index + 1];
      index += 1;
      continue;
    }
    out += ch;
  }
  return out;
};

const parseInlines = (source: string): DescriptionNode[] | null => {
  if (source.includes('\r') || source.includes('\0')) {
    return null;
  }
  const parsed = parseInlineRange(source, 0, source.length);
  if (parsed === null || parsed.index !== source.length) {
    return null;
  }
  return parsed.nodes;
};

const linesToInlineSource = (lines: string[]): string | null => {
  let source = '';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const hasBreak = index < lines.length - 1;
    if (!hasBreak) {
      source += line;
      continue;
    }
    if (!line.endsWith('  ')) {
      return null;
    }
    source += `${line.slice(0, -2)}\n`;
  }
  return source;
};

const parseListBlock = (block: string): DescriptionNode | null => {
  const lines = block.split('\n');
  const first = lines[0] ?? '';
  const unordered = first.startsWith('- ');
  const ordered = first.startsWith('1. ');
  if (!unordered && !ordered) {
    return null;
  }

  const items: DescriptionNode[] = [];
  let expected = 1;
  let current: string[] | null = null;
  let markerLength = 0;

  const pushItem = (): boolean => {
    if (current === null) {
      return true;
    }
    const source = linesToInlineSource(current);
    if (source === null) {
      return false;
    }
    const children = parseInlines(source);
    if (children === null) {
      return false;
    }
    items.push({ kind: 'li', children });
    current = null;
    return true;
  };

  for (const line of lines) {
    if (unordered && line.startsWith('- ')) {
      if (!pushItem()) {
        return null;
      }
      current = [line.slice(2)];
      markerLength = 2;
      continue;
    }
    if (ordered && !line.startsWith(' ')) {
      const match = /^(\d+)\. (.*)$/.exec(line);
      if (match !== null) {
        const number = Number(match[1]);
        if (number !== expected) {
          return null;
        }
        if (!pushItem()) {
          return null;
        }
        expected += 1;
        current = [match[2] ?? ''];
        markerLength = (match[1] ?? '').length + 2;
        continue;
      }
    }
    if (current === null) {
      return null;
    }
    const indent = ' '.repeat(markerLength);
    if (!line.startsWith(indent)) {
      return null;
    }
    current.push(line.slice(markerLength));
  }

  if (!pushItem() || items.length === 0) {
    return null;
  }
  return { kind: unordered ? 'ul' : 'ol', children: items };
};

const parseHeadingBlock = (block: string): DescriptionNode | null => {
  const lines = block.split('\n');
  const marker = /^(#{1,6}) (.*)$/.exec(lines[0] ?? '');
  if (marker === null) {
    return null;
  }
  const contentLines = [marker[2] ?? '', ...lines.slice(1)];
  const source = linesToInlineSource(contentLines);
  if (source === null) {
    return null;
  }
  const children = parseInlines(source);
  if (children === null) {
    return null;
  }
  return headingNode(marker[1]?.length ?? 0, children);
};

const parseBlock = (block: string): DescriptionNode | null => {
  if (block.startsWith('- ') || block.startsWith('1. ')) {
    return parseListBlock(block);
  }
  if (/^#{1,6} /.test(block)) {
    return parseHeadingBlock(block);
  }
  const source = linesToInlineSource(block.split('\n'));
  if (source === null) {
    return null;
  }
  const children = parseInlines(source);
  if (children === null) {
    return null;
  }
  return { kind: 'p', children };
};

const hasForeignAngle = (source: string): boolean => {
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] !== '<') {
      continue;
    }
    if (source.startsWith('<u>', index) || source.startsWith('</u>', index)) {
      continue;
    }
    return true;
  }
  return false;
};

const escapeMarkdownText = (value: string, lineStart: boolean): string => {
  let escaped = '';
  for (const ch of value) {
    if (ch === '\\' || ch === '*' || ch === '[' || ch === ']' || ch === '<' || ch === '>') {
      escaped += `\\${ch}`;
      continue;
    }
    escaped += ch;
  }
  if (!lineStart || escaped.length === 0) {
    return escaped;
  }
  if (/^#{1,6} /.test(escaped) || /^\d+\. /.test(escaped) || escaped.startsWith('- ')) {
    return `\\${escaped}`;
  }
  return escaped;
};

const escapeHref = (href: string): string => href.replace(/\\/g, '\\\\').replace(/\)/g, '\\)');

type InlineOut = { text: string; lineStart: boolean };

const appendText = (out: InlineOut, value: string): void => {
  const parts = value.split('\n');
  for (let index = 0; index < parts.length; index += 1) {
    if (index > 0) {
      out.text += '  \n';
      out.lineStart = true;
    }
    const part = parts[index] ?? '';
    out.text += escapeMarkdownText(part, out.lineStart);
    if (part.length > 0) {
      out.lineStart = false;
    }
  }
};

const isBlockKind = (kind: DescriptionNode['kind']): boolean =>
  kind === 'p' ||
  kind === 'ul' ||
  kind === 'ol' ||
  kind === 'h1' ||
  kind === 'h2' ||
  kind === 'h3' ||
  kind === 'h4' ||
  kind === 'h5' ||
  kind === 'h6';

const writeInline = (node: DescriptionNode, out: InlineOut): void => {
  if (node.kind === 'text') {
    appendText(out, node.text);
    return;
  }
  if (node.kind === 'br') {
    out.text += '  \n';
    out.lineStart = true;
    return;
  }
  if (node.kind === 'strong' || node.kind === 'em' || node.kind === 'u') {
    const inner = serializeInlines(node.children, false);
    if (inner.length === 0) {
      return;
    }
    let open = '<u>';
    let close = '</u>';
    if (node.kind === 'strong') {
      open = '**';
      close = '**';
    } else if (node.kind === 'em') {
      open = '*';
      close = '*';
    }
    out.text += `${open}${inner}${close}`;
    out.lineStart = false;
    return;
  }
  if (node.kind === 'a') {
    const inner = serializeInlines(node.children, false);
    if (inner.length === 0) {
      return;
    }
    if (!isAllowedLinkHref(node.href)) {
      out.text += inner;
      out.lineStart = false;
      return;
    }
    out.text += `[${inner}](${escapeHref(node.href)})`;
    out.lineStart = false;
    return;
  }
  if (node.kind === 'li') {
    appendText(out, serializeInlines(node.children, out.lineStart));
    return;
  }
  if (isBlockKind(node.kind)) {
    out.text += serializeBlock(node);
    out.lineStart = false;
  }
};

const serializeInlines = (nodes: DescriptionNode[], lineStart: boolean): string => {
  const out: InlineOut = { text: '', lineStart };
  for (const node of nodes) {
    writeInline(node, out);
  }
  return out.text;
};

const serializeList = (node: DescriptionNode): string => {
  if (node.kind !== 'ul' && node.kind !== 'ol') {
    return '';
  }
  const lines: string[] = [];
  let itemNumber = 0;
  for (const child of node.children) {
    if (child.kind !== 'li') {
      continue;
    }
    itemNumber += 1;
    const marker = node.kind === 'ul' ? '- ' : `${itemNumber}. `;
    const body = serializeInlines(child.children, false);
    const parts = body.split('\n');
    const indent = ' '.repeat(marker.length);
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index] ?? '';
      lines.push(index === 0 ? `${marker}${part}` : `${indent}${part}`);
    }
  }
  return lines.join('\n');
};

const serializeHeading = (node: DescriptionNode): string => {
  if (
    node.kind !== 'h1' &&
    node.kind !== 'h2' &&
    node.kind !== 'h3' &&
    node.kind !== 'h4' &&
    node.kind !== 'h5' &&
    node.kind !== 'h6'
  ) {
    return '';
  }
  const level = Number(node.kind.slice(1));
  const body = serializeInlines(node.children, false);
  const parts = body.split('\n');
  const marker = `${'#'.repeat(level)} `;
  return parts.map((part, index) => (index === 0 ? `${marker}${part}` : part)).join('\n');
};

const serializeBlock = (node: DescriptionNode): string => {
  if (node.kind === 'p') {
    return serializeInlines(node.children, true);
  }
  if (node.kind === 'ul' || node.kind === 'ol') {
    return serializeList(node);
  }
  if (
    node.kind === 'h1' ||
    node.kind === 'h2' ||
    node.kind === 'h3' ||
    node.kind === 'h4' ||
    node.kind === 'h5' ||
    node.kind === 'h6'
  ) {
    return serializeHeading(node);
  }
  return serializeInlines([node], true);
};

export function serializeDescriptionMarkdown(nodes: DescriptionNode[]): string {
  const blocks: string[] = [];
  let inlineRun: DescriptionNode[] = [];

  const flushInlines = (): void => {
    if (inlineRun.length === 0) {
      return;
    }
    const block = serializeInlines(inlineRun, true);
    if (block.length > 0) {
      blocks.push(block);
    }
    inlineRun = [];
  };

  for (const node of nodes) {
    if (!isBlockKind(node.kind)) {
      inlineRun.push(node);
      continue;
    }
    flushInlines();
    const block = serializeBlock(node);
    if (block.length > 0) {
      blocks.push(block);
    }
  }
  flushInlines();
  return blocks.join('\n\n');
}

/**
 * Parse markdown that this module wrote. Returns null when the string is not that form,
 * so HTML and plain text can take another path.
 */
export function parseDescriptionMarkdown(input: string): DescriptionNode[] | null {
  if (input.length === 0 || hasForeignAngle(input)) {
    return null;
  }
  if (input.includes('\n\n\n') || input.startsWith('\n') || input.endsWith('\n\n')) {
    return null;
  }
  const blocks = input.split('\n\n');
  const nodes: DescriptionNode[] = [];
  for (const block of blocks) {
    if (block.length === 0) {
      return null;
    }
    const parsed = parseBlock(block);
    if (parsed === null) {
      return null;
    }
    nodes.push(parsed);
  }
  if (serializeDescriptionMarkdown(nodes) !== input) {
    return null;
  }
  return nodes;
}

const cutPlainPreview = (plain: string, maxChars: number): string => {
  const collapsed = plain.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxChars) {
    return collapsed;
  }
  const truncated = collapsed.slice(0, maxChars);
  const lastWhitespace = truncated.search(/\s+\S*$/);
  if (lastWhitespace === -1) {
    return truncated;
  }
  return truncated.slice(0, lastWhitespace);
};

const markdownToPlainPreview = (value: string, maxChars: number): string => {
  const source = value.slice(0, Math.max(maxChars * 6, maxChars));
  let plain = '';
  let lineStart = true;
  let index = 0;

  while (index < source.length && plain.length < maxChars + 80) {
    const ch = source[index] ?? '';
    if (ch === '\\' && index + 1 < source.length) {
      plain += source[index + 1];
      lineStart = false;
      index += 2;
      continue;
    }
    if (ch === '\n') {
      plain += '\n';
      lineStart = true;
      index += 1;
      continue;
    }
    if (lineStart) {
      const heading = /^(#{1,6}) /.exec(source.slice(index));
      if (heading !== null) {
        index += heading[0].length;
        continue;
      }
      if (source.startsWith('- ', index)) {
        index += 2;
        continue;
      }
      const ordered = /^(\d+)\. /.exec(source.slice(index));
      if (ordered !== null) {
        index += ordered[0].length;
        continue;
      }
    }
    if (source.startsWith('<u>', index)) {
      index += 3;
      continue;
    }
    if (source.startsWith('</u>', index)) {
      index += 4;
      continue;
    }
    if (source.startsWith('**', index)) {
      index += 2;
      continue;
    }
    if (ch === '*') {
      index += 1;
      continue;
    }
    if (ch === '[') {
      const labelEnd = source.indexOf('](', index);
      const hrefEnd = labelEnd === -1 ? null : findMarker(source, labelEnd + 2, source.length, ')');
      if (labelEnd !== -1 && hrefEnd !== null) {
        plain += source.slice(index + 1, labelEnd).replace(/[*]/g, '');
        index = hrefEnd + 1;
        lineStart = false;
        continue;
      }
    }
    plain += ch;
    if (ch !== ' ' && ch !== '\t') {
      lineStart = false;
    }
    index += 1;
  }

  return cutPlainPreview(plain, maxChars);
};

/** Bounded plain text for a list row when only the stored description is present. */
export function descriptionValueToPlainPreview(value: string, maxChars: number): string {
  if (HTML_TAG_OTHER_THAN_UNDERLINE.test(value)) {
    return htmlToPlainTextPreview(value, maxChars);
  }
  return markdownToPlainPreview(value, maxChars);
}
