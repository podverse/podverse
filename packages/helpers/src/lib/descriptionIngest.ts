import type { DescriptionNode } from './descriptionDocument.js';
import { buildDescriptionTree, descriptionNodesToPlainText } from './descriptionDocument.js';
import type { DescriptionLengthTierEnum } from './descriptionLimits.js';
import { DESCRIPTION_LENGTH_TIERS, DESCRIPTION_PREVIEW_MAX_LENGTH } from './descriptionLimits.js';
import { parseDescriptionMarkdown, serializeDescriptionMarkdown } from './descriptionMarkdown.js';
import { htmlToPlainText } from './html.js';

export type PreparedDescription = {
  value: string;
  preview: string;
  is_truncated: boolean;
  source_length: number;
};

const TAG_LIKE_PATTERN = /<[A-Za-z/]/;

const HEADING_KINDS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const escapePlainText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const asParagraphHtml = (input: string): string => {
  const normalized = input.replace(/\r\n?/g, '\n');
  const paragraphs = normalized.split(/\n\s*\n+/);
  const htmlParagraphs = paragraphs
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => escapePlainText(line));
      return `<p>${lines.join('<br>')}</p>`;
    });

  return htmlParagraphs.join('');
};

const isVisible = (value: string | undefined): boolean =>
  value !== undefined && htmlToPlainText(value).trim().length > 0;

const visibleLength = (node: DescriptionNode): number =>
  descriptionNodesToPlainText([node], '\n').length;

const withTextNode = (node: DescriptionNode, text: string): DescriptionNode => {
  if (node.kind === 'text') {
    return { kind: 'text', text };
  }

  if (node.kind === 'br') {
    return { kind: 'text', text };
  }

  if (node.kind === 'a') {
    return { kind: 'a', href: node.href, children: [{ kind: 'text', text }] };
  }

  if (node.kind === 'ul' || node.kind === 'ol') {
    return {
      kind: node.kind,
      children: [{ kind: 'li', children: [{ kind: 'text', text }] }],
    };
  }

  return { kind: node.kind, children: [{ kind: 'text', text }] };
};

const truncateFirstBlockText = (
  node: DescriptionNode,
  maxLength: number
): DescriptionNode | null => {
  if (maxLength <= 0) {
    return null;
  }

  const plain = descriptionNodesToPlainText([node], ' ').trim();
  if (plain.length === 0) {
    return null;
  }

  if (plain.length <= maxLength) {
    return node;
  }

  if (maxLength === 1) {
    return withTextNode(node, '…');
  }

  const visibleBudget = maxLength - 1;
  const bounded = plain.slice(0, visibleBudget);
  const lastWhitespace = bounded.search(/\s+\S*$/);
  const cut = lastWhitespace > 0 ? bounded.slice(0, lastWhitespace).trimEnd() : bounded.trimEnd();
  const fallback = cut.length > 0 ? cut : bounded.trimEnd();
  const text = `${fallback}…`;
  return withTextNode(node, text);
};

const truncateListNode = (
  node: DescriptionNode,
  maxLength: number,
  allowFirstBlockTextCut: boolean
): DescriptionNode | null => {
  if (node.kind !== 'ul' && node.kind !== 'ol') {
    return null;
  }

  let remaining = maxLength;
  const keptItems: DescriptionNode[] = [];

  for (const child of node.children) {
    if (child.kind !== 'li') {
      continue;
    }

    const itemLength = visibleLength(child);
    if (itemLength <= remaining) {
      keptItems.push(child);
      remaining -= itemLength;
      continue;
    }

    if (keptItems.length === 0 && allowFirstBlockTextCut) {
      const cut = truncateFirstBlockText(child, remaining);
      if (cut !== null && cut.kind === 'li') {
        keptItems.push(cut);
      }
    }
    break;
  }

  if (keptItems.length === 0) {
    return null;
  }

  return { kind: node.kind, children: keptItems };
};

const trimTrailingHeadings = (nodes: DescriptionNode[]): DescriptionNode[] => {
  const trimmed = [...nodes];
  while (trimmed.length > 0) {
    const tail = trimmed[trimmed.length - 1];
    if (tail === undefined || !HEADING_KINDS.has(tail.kind)) {
      break;
    }
    trimmed.pop();
  }
  return trimmed;
};

const truncateDescriptionTree = (
  nodes: DescriptionNode[],
  maxVisibleLength: number
): { nodes: DescriptionNode[]; isTruncated: boolean } => {
  const kept: DescriptionNode[] = [];
  let remaining = maxVisibleLength;
  let isTruncated = false;

  for (const node of nodes) {
    const hasKeptAny = kept.length > 0;
    if (node.kind === 'ul' || node.kind === 'ol') {
      const listLength = visibleLength(node);
      if (listLength <= remaining) {
        kept.push(node);
        remaining -= listLength;
        continue;
      }

      isTruncated = true;
      const partialList = truncateListNode(node, remaining, !hasKeptAny);
      if (partialList !== null) {
        kept.push(partialList);
      }
      break;
    }

    const blockLength = visibleLength(node);
    if (blockLength <= remaining) {
      kept.push(node);
      remaining -= blockLength;
      continue;
    }

    isTruncated = true;
    if (!hasKeptAny) {
      const cut = truncateFirstBlockText(node, remaining);
      if (cut !== null) {
        kept.push(cut);
      }
    }
    break;
  }

  if (!isTruncated) {
    return { nodes, isTruncated: false };
  }

  return { nodes: trimTrailingHeadings(kept), isTruncated: true };
};

const dropLastBlock = (nodes: DescriptionNode[]): DescriptionNode[] => {
  const next = [...nodes];
  for (let i = next.length - 1; i >= 0; i -= 1) {
    const node = next[i];
    if (node === undefined) {
      continue;
    }

    if (node.kind !== 'ul' && node.kind !== 'ol') {
      next.splice(i, 1);
      return next;
    }

    const listChildren = [...node.children];
    for (let j = listChildren.length - 1; j >= 0; j -= 1) {
      if (listChildren[j]?.kind !== 'li') {
        continue;
      }

      listChildren.splice(j, 1);
      const hasAnyListItems = listChildren.some((child) => child.kind === 'li');
      if (!hasAnyListItems) {
        next.splice(i, 1);
      } else {
        next[i] = { kind: node.kind, children: listChildren };
      }
      return next;
    }

    next.splice(i, 1);
    return next;
  }

  return [];
};

const descriptionTreeForStorage = (input: string): DescriptionNode[] => {
  const canonical = parseDescriptionMarkdown(input);
  if (canonical !== null) {
    return canonical;
  }
  const source = TAG_LIKE_PATTERN.test(input) ? input : asParagraphHtml(input);
  return buildDescriptionTree(source, 'lenient');
};

const buildPreview = (nodes: DescriptionNode[]): string => {
  const plain = collapseWhitespace(descriptionNodesToPlainText(nodes, ' '));
  if (plain.length <= DESCRIPTION_PREVIEW_MAX_LENGTH) {
    return plain;
  }

  const bounded = plain.slice(0, DESCRIPTION_PREVIEW_MAX_LENGTH);
  const lastWhitespace = bounded.search(/\s+\S*$/);
  if (lastWhitespace === -1) {
    return bounded;
  }

  return bounded.slice(0, lastWhitespace);
};

export function prepareDescriptionForStorage(
  input: string | null | undefined,
  tier: DescriptionLengthTierEnum
): PreparedDescription | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (input.trim().length === 0) {
    return null;
  }

  const tree = descriptionTreeForStorage(input);
  if (tree.length === 0) {
    return null;
  }

  const limits = DESCRIPTION_LENGTH_TIERS[tier];
  const sourceLength = descriptionNodesToPlainText(tree, '\n').length;
  const visibleTruncation = truncateDescriptionTree(tree, limits.visibleMax);
  let keptTree = visibleTruncation.nodes;
  let isTruncated = visibleTruncation.isTruncated;

  let value = serializeDescriptionMarkdown(keptTree);
  while (value.length > limits.storedMax && keptTree.length > 0) {
    keptTree = dropLastBlock(keptTree);
    value = serializeDescriptionMarkdown(keptTree);
    isTruncated = true;
  }

  if (keptTree.length === 0 || value.length === 0) {
    return null;
  }

  return {
    value,
    preview: buildPreview(keptTree),
    is_truncated: isTruncated,
    source_length: sourceLength,
  };
}

export function pickItemDescriptionSource(parts: {
  content?: string;
  descriptionRaw?: string;
  description?: string;
  summary?: string;
}): string | null {
  const values = [parts.content, parts.descriptionRaw, parts.description, parts.summary];
  for (const value of values) {
    if (isVisible(value)) {
      return value ?? null;
    }
  }
  return null;
}

export function pickChannelDescriptionSource(parts: {
  descriptionRaw?: string;
  description?: string;
}): string | null {
  const values = [parts.descriptionRaw, parts.description];
  for (const value of values) {
    if (isVisible(value)) {
      return value ?? null;
    }
  }
  return null;
}
