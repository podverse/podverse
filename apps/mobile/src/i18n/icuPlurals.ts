/**
 * The catalog is authored in next-intl ICU form.
 * Mobile's i18next selects plurals by `<key>_<category>` siblings and `count`, so a caller of a
 * plural key whose argument is not `count` (`{minutes, plural, …}`) also passes `count`.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type IcuPluralParse =
  | { kind: 'none' }
  | { kind: 'plural'; base: string; forms: Partial<Record<PluralCategory, string>> }
  | { kind: 'unsupported'; reason: string };

export type CatalogTree = { [key: string]: unknown };

export type IcuPluralExpansion = { tree: CatalogTree; unsupportedKeys: string[] };

const PLURAL_CATEGORIES: readonly PluralCategory[] = [
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
];

const TYPED_ARGUMENT =
  /\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*(plural|select|selectordinal)\s*,/;

const NESTED_TYPED_ARGUMENT = /\{\s*[A-Za-z_][A-Za-z0-9_]*\s*,/;

const ICU_QUOTING = /'[{}#']/;

function unsupported(reason: string): IcuPluralParse {
  return { kind: 'unsupported', reason };
}

function isPluralCategory(value: string): value is PluralCategory {
  for (const category of PLURAL_CATEGORIES) {
    if (category === value) {
      return true;
    }
  }
  return false;
}

function isPlainCatalogObject(value: unknown): value is CatalogTree {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function skipSpace(value: string, index: number): number {
  let next = index;
  while (next < value.length) {
    const char = value[next];
    if (char !== ' ' && char !== '\n' && char !== '\t' && char !== '\r') {
      break;
    }
    next += 1;
  }
  return next;
}

function bracesBalance(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth < 0) {
        return false;
      }
    }
  }
  return depth === 0;
}

function readIdentifier(value: string, index: number): { name: string; next: number } | null {
  const first = value[index];
  if (first === undefined || !/[A-Za-z_]/.test(first)) {
    return null;
  }
  let next = index + 1;
  while (next < value.length) {
    const char = value[next];
    if (char === undefined || !/[A-Za-z0-9_]/.test(char)) {
      break;
    }
    next += 1;
  }
  return { name: value.slice(index, next), next };
}

function readBalancedBranch(
  value: string,
  openIndex: number
): { text: string; next: number } | null {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { text: value.slice(openIndex + 1, index), next: index + 1 };
      }
    }
  }
  return null;
}

function categoriesIn(forms: Partial<Record<PluralCategory, string>>): PluralCategory[] {
  const categories: PluralCategory[] = [];
  for (const category of PLURAL_CATEGORIES) {
    if (forms[category] !== undefined) {
      categories.push(category);
    }
  }
  return categories;
}

export function parseIcuPlural(value: string): IcuPluralParse {
  const match = TYPED_ARGUMENT.exec(value);
  if (match === null) {
    return { kind: 'none' };
  }

  const argumentName = match[1];
  const keyword = match[2];
  if (argumentName === undefined || keyword === undefined) {
    return unsupported('unbalanced-braces');
  }
  if (keyword === 'select' || keyword === 'selectordinal') {
    return unsupported(keyword);
  }
  if (ICU_QUOTING.test(value)) {
    return unsupported('icu-quoting');
  }
  if (!bracesBalance(value)) {
    return unsupported('unbalanced-braces');
  }

  const forms: Partial<Record<PluralCategory, string>> = {};
  let index = match.index + match[0].length;
  let closed = false;

  while (index < value.length) {
    index = skipSpace(value, index);
    const char = value[index];
    if (char === '}') {
      index += 1;
      closed = true;
      break;
    }
    if (char === undefined) {
      return unsupported('unbalanced-braces');
    }
    if (char === '=') {
      return unsupported('exact-selector');
    }

    const identifier = readIdentifier(value, index);
    if (identifier === null) {
      return unsupported('unknown-selector');
    }
    index = skipSpace(value, identifier.next);
    if (value[index] === ':') {
      return unsupported(identifier.name === 'offset' ? 'offset' : 'unknown-selector');
    }
    if (!isPluralCategory(identifier.name)) {
      return unsupported('unknown-selector');
    }
    if (forms[identifier.name] !== undefined) {
      return unsupported('duplicate-selector');
    }

    index = skipSpace(value, index);
    if (value[index] !== '{') {
      return unsupported('unbalanced-braces');
    }
    const branch = readBalancedBranch(value, index);
    if (branch === null) {
      return unsupported('unbalanced-braces');
    }
    if (NESTED_TYPED_ARGUMENT.test(branch.text)) {
      return unsupported('nested-typed-argument');
    }
    forms[identifier.name] = branch.text;
    index = branch.next;
  }

  if (!closed) {
    return unsupported('unbalanced-braces');
  }
  if (forms.other === undefined) {
    return unsupported('missing-other');
  }

  const suffix = value.slice(index);
  if (TYPED_ARGUMENT.test(suffix)) {
    return unsupported('multiple-blocks');
  }

  const prefix = value.slice(0, match.index);
  const expanded: Partial<Record<PluralCategory, string>> = {};
  for (const category of categoriesIn(forms)) {
    const branch = forms[category];
    if (branch === undefined) {
      continue;
    }
    expanded[category] = `${prefix}${branch.replaceAll('#', `{${argumentName}, number}`)}${suffix}`;
  }

  const base = expanded.other;
  if (base === undefined) {
    return unsupported('missing-other');
  }
  return { kind: 'plural', base, forms: expanded };
}

function expandNode(node: CatalogTree, path: string, unsupportedKeys: string[]): CatalogTree {
  const result: CatalogTree = {};
  for (const [key, value] of Object.entries(node)) {
    const childPath = path.length === 0 ? key : `${path}.${key}`;
    if (typeof value === 'string') {
      const parsed = parseIcuPlural(value);
      if (parsed.kind === 'plural') {
        const categories = categoriesIn(parsed.forms);
        const conflict = categories.some((category) =>
          Object.hasOwn(node, `${key}_${category}`)
        );
        if (conflict) {
          unsupportedKeys.push(childPath);
          result[key] = value;
          continue;
        }
        result[key] = parsed.base;
        for (const category of categories) {
          const form = parsed.forms[category];
          if (form !== undefined) {
            result[`${key}_${category}`] = form;
          }
        }
        continue;
      }
      if (parsed.kind === 'unsupported') {
        unsupportedKeys.push(childPath);
      }
      result[key] = value;
      continue;
    }
    if (isPlainCatalogObject(value)) {
      result[key] = expandNode(value, childPath, unsupportedKeys);
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function expandIcuPlurals(tree: CatalogTree): IcuPluralExpansion {
  const unsupportedKeys: string[] = [];
  return { tree: expandNode(tree, '', unsupportedKeys), unsupportedKeys };
}
