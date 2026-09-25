import { decodeHtmlEntities, htmlToPlainText } from './html.js';

/**
 * A feed description after parsing: always a plain-text fallback, and a rich tree only when the
 * markup is balanced and fits the About / Summary allowlist.
 */
export type DescriptionDocument = {
  plain: string;
  rich: DescriptionNode[] | null;
};

export type DescriptionNode =
  | { kind: 'text'; text: string }
  | { kind: 'br' }
  | {
      kind: 'a';
      href: string;
      children: DescriptionNode[];
    }
  | {
      kind:
        'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul' | 'ol' | 'li' | 'strong' | 'em' | 'u';
      children: DescriptionNode[];
    };

const ALLOWED_CONTAINER_KINDS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'u',
]);

const VOID_TAGS = new Set([
  'br',
  'img',
  'hr',
  'meta',
  'link',
  'input',
  'source',
  'area',
  'base',
  'col',
  'embed',
  'wbr',
]);

const DROP_CONTENTS_TAGS = new Set(['script', 'style']);

const TAG_ALIASES: Record<string, string> = {
  b: 'strong',
  strong: 'strong',
  i: 'em',
  em: 'em',
  u: 'u',
  p: 'p',
  br: 'br',
  a: 'a',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
};

type Token =
  | { type: 'text'; value: string }
  | { type: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean }
  | { type: 'close'; name: string };

type Frame = {
  kind: string;
  openName?: string;
  href?: string;
  children: DescriptionNode[];
};

class DescriptionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DescriptionParseError';
  }
}

const isAllowedLinkHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:');
};

const parseAttributes = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(raw)) !== null) {
    const name = match[1]?.toLowerCase();
    if (name === undefined || name.length === 0) {
      continue;
    }
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = decodeHtmlEntities(value);
  }
  return attrs;
};

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    if (input[index] !== '<') {
      const next = input.indexOf('<', index);
      const end = next === -1 ? input.length : next;
      const raw = input.slice(index, end);
      if (raw.length > 0) {
        tokens.push({ type: 'text', value: decodeHtmlEntities(raw) });
      }
      index = end;
      continue;
    }

    // HTML comments: find --> rather than the first >
    if (input.startsWith('<!--', index)) {
      const commentEnd = input.indexOf('-->', index + 4);
      if (commentEnd === -1) {
        throw new DescriptionParseError('Unclosed comment');
      }
      index = commentEnd + 3;
      continue;
    }

    const closeIndex = input.indexOf('>', index);
    if (closeIndex === -1) {
      throw new DescriptionParseError('Truncated tag');
    }

    const rawTag = input.slice(index + 1, closeIndex).trim();
    index = closeIndex + 1;

    if (rawTag.length === 0) {
      throw new DescriptionParseError('Empty tag');
    }

    if (rawTag.startsWith('!')) {
      continue;
    }

    if (rawTag.startsWith('/')) {
      const name = rawTag.slice(1).trim().toLowerCase().split(/\s+/)[0];
      if (name === undefined || name.length === 0) {
        throw new DescriptionParseError('Empty close tag');
      }
      tokens.push({ type: 'close', name });
      continue;
    }

    const selfClosing = rawTag.endsWith('/');
    const tagBody = selfClosing ? rawTag.slice(0, -1).trim() : rawTag;
    const nameMatch = /^([a-zA-Z][\w:-]*)/.exec(tagBody);
    if (nameMatch === null || nameMatch[1] === undefined) {
      throw new DescriptionParseError('Invalid open tag');
    }
    const name = nameMatch[1].toLowerCase();
    const attrRaw = tagBody.slice(nameMatch[0].length);
    tokens.push({
      type: 'open',
      name,
      attrs: parseAttributes(attrRaw),
      selfClosing: selfClosing || VOID_TAGS.has(name),
    });
  }

  return tokens;
};

const pushText = (children: DescriptionNode[], text: string): void => {
  if (text.length === 0) {
    return;
  }
  const last = children[children.length - 1];
  if (last !== undefined && last.kind === 'text') {
    last.text += text;
    return;
  }
  children.push({ kind: 'text', text });
};

const finishFrame = (frame: Frame): DescriptionNode | DescriptionNode[] | null => {
  if (frame.kind === 'a') {
    const href = frame.href ?? '';
    if (!isAllowedLinkHref(href)) {
      return frame.children;
    }
    return { kind: 'a', href, children: frame.children };
  }

  if (frame.kind === 'unwrap') {
    return frame.children;
  }

  if (ALLOWED_CONTAINER_KINDS.has(frame.kind)) {
    return {
      kind: frame.kind as
        'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul' | 'ol' | 'li' | 'strong' | 'em' | 'u',
      children: frame.children,
    };
  }

  return frame.children;
};

const appendFinished = (
  parentChildren: DescriptionNode[],
  finished: DescriptionNode | DescriptionNode[] | null
): void => {
  if (finished === null) {
    return;
  }
  if (Array.isArray(finished)) {
    for (const node of finished) {
      if (node.kind === 'text') {
        pushText(parentChildren, node.text);
      } else {
        parentChildren.push(node);
      }
    }
    return;
  }
  parentChildren.push(finished);
};

const parseTokensToRich = (tokens: Token[]): DescriptionNode[] => {
  const root: DescriptionNode[] = [];
  const stack: Frame[] = [{ kind: 'root', children: root }];
  let dropDepth = 0;

  for (const token of tokens) {
    if (dropDepth > 0) {
      if (token.type === 'open' && !token.selfClosing && !VOID_TAGS.has(token.name)) {
        dropDepth += 1;
      } else if (token.type === 'close') {
        dropDepth -= 1;
        if (dropDepth < 0) {
          throw new DescriptionParseError('Unexpected close inside dropped content');
        }
      }
      continue;
    }

    const current = stack[stack.length - 1];
    if (current === undefined) {
      throw new DescriptionParseError('Empty stack');
    }

    if (token.type === 'text') {
      pushText(current.children, token.value);
      continue;
    }

    if (token.type === 'open') {
      if (DROP_CONTENTS_TAGS.has(token.name)) {
        if (!token.selfClosing) {
          dropDepth = 1;
        }
        continue;
      }

      if (token.name === 'br') {
        current.children.push({ kind: 'br' });
        continue;
      }

      if (VOID_TAGS.has(token.name) || token.selfClosing) {
        continue;
      }

      const alias = TAG_ALIASES[token.name];
      if (alias === 'a') {
        stack.push({
          kind: 'a',
          href: token.attrs.href ?? '',
          children: [],
        });
        continue;
      }

      if (alias !== undefined && ALLOWED_CONTAINER_KINDS.has(alias)) {
        stack.push({ kind: alias, children: [] });
        continue;
      }

      stack.push({ kind: 'unwrap', openName: token.name, children: [] });
      continue;
    }

    if (stack.length <= 1) {
      throw new DescriptionParseError('Unexpected close tag');
    }

    const frame = stack.pop();
    const parent = stack[stack.length - 1];
    if (frame === undefined || parent === undefined) {
      throw new DescriptionParseError('Unexpected close tag');
    }

    if (frame.kind === 'unwrap') {
      if (frame.openName !== token.name) {
        throw new DescriptionParseError('Mismatched unwrap close tag');
      }
      appendFinished(parent.children, finishFrame(frame));
      continue;
    }

    if (frame.kind === 'a') {
      if (token.name !== 'a') {
        throw new DescriptionParseError('Mismatched link close tag');
      }
      appendFinished(parent.children, finishFrame(frame));
      continue;
    }

    const closedAlias = TAG_ALIASES[token.name] ?? token.name;
    if (closedAlias !== frame.kind) {
      throw new DescriptionParseError('Mismatched close tag');
    }

    appendFinished(parent.children, finishFrame(frame));
  }

  if (stack.length !== 1 || dropDepth !== 0) {
    throw new DescriptionParseError('Unclosed tags');
  }

  return root;
};

/**
 * Read a feed description into plain text plus an optional rich tree.
 *
 * The rich tree is present only when every tag is balanced and the markup fits the About /
 * Summary allowlist (or well-formed tags that unwrap). Unbalanced or truncated markup yields
 * `rich: null` so callers show the plain string only.
 */
export function readDescriptionDocument(input?: string | null): DescriptionDocument {
  const source = input ?? '';
  const plain = htmlToPlainText(source);

  if (source.trim().length === 0) {
    return { plain: '', rich: null };
  }

  try {
    const tokens = tokenize(source);
    const rich = parseTokensToRich(tokens);
    if (rich.length === 0) {
      return { plain, rich: plain.length > 0 ? [{ kind: 'text', text: plain }] : null };
    }
    return { plain, rich };
  } catch {
    return { plain, rich: null };
  }
}
