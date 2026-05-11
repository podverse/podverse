/**
 * Tier A (NodeNext): relative imports must use `.js` specifiers matching emitted JS.
 * Tier B (Next app src): disabled via eslint.config.mjs override.
 *
 * Uses filesystem resolution for directory barrels (`./Dir/index.js` vs `./Dir.js`).
 * Keep aligned with Metaboost `eslint-rules/require-relative-js-extension.mjs`.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} pathStr
 * @returns {string}
 */
function tsSpecifierToJs(pathStr) {
  return pathStr.replace(/\.tsx(\?|$)/, '.js$1').replace(/\.ts(\?|$)/, '.js$1');
}

/**
 * @param {string} fromFile Absolute path to the file containing the import.
 * @param {string} specifier Import string literal value.
 * @returns {string | null} Expected specifier, or null if skipped / unknown.
 */
function expectedNodeNextSpecifier(fromFile, specifier) {
  const qIdx = specifier.indexOf('?');
  const pathPart = qIdx >= 0 ? specifier.slice(0, qIdx) : specifier;
  const query = qIdx >= 0 ? specifier.slice(qIdx) : '';

  if (/\.(json|scss|sass|css|svg|png|jpe?g|gif|webp|woff2?|ttf|eot|md)(\?|$)/i.test(specifier)) {
    return null;
  }
  if (/\.mjs(\?|$)/.test(specifier) || /\.cjs(\?|$)/.test(specifier)) {
    return null;
  }

  const dir = path.dirname(fromFile);

  if (/\.(ts|tsx)(\?|$)/.test(specifier)) {
    return tsSpecifierToJs(specifier);
  }

  const abs = path.resolve(dir, pathPart);

  if (/\.js(\?|$)/.test(specifier)) {
    const withoutJs = pathPart.replace(/\.js$/, '');
    const absBase = path.resolve(dir, withoutJs);
    if (fs.existsSync(`${absBase}.ts`) || fs.existsSync(`${absBase}.tsx`)) {
      return `${withoutJs}.js${query}`;
    }
    if (
      fs.existsSync(path.join(absBase, 'index.ts')) ||
      fs.existsSync(path.join(absBase, 'index.tsx'))
    ) {
      return `${withoutJs}/index.js${query}`;
    }
    return null;
  }

  if (fs.existsSync(`${abs}.ts`) || fs.existsSync(`${abs}.tsx`)) {
    return `${pathPart}.js${query}`;
  }
  if (fs.existsSync(path.join(abs, 'index.ts')) || fs.existsSync(path.join(abs, 'index.tsx'))) {
    return `${pathPart}/index.js${query}`;
  }

  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require `.js` on relative module specifiers (NodeNext). Asset-only extensions are exempt.',
    },
    schema: [],
    fixable: 'code',
    messages: {
      needJs:
        'Relative import "{{path}}" must use a `.js` specifier (NodeNext). Expected: {{expected}}.',
      useJsNotTs:
        'Relative import "{{path}}" must use `.js` in the specifier (NodeNext), not `.ts` or `.tsx`.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const fromFile = path.resolve(context.filename ?? '');

    /**
     * @param {import('estree').Literal | import('estree').SimpleLiteral | null | undefined} sourceNode
     * @param {string} fixedPath
     */
    function replaceSpecifier(sourceNode, fixedPath) {
      const rawText = sourceCode.getText(sourceNode);
      const quote = rawText[0] === "'" ? "'" : '"';
      return `${quote}${fixedPath}${quote}`;
    }

    /**
     * @param {import('estree').Literal | import('estree').SimpleLiteral | null | undefined} sourceNode
     */
    function checkLiteral(sourceNode) {
      if (!sourceNode || sourceNode.type !== 'Literal') {
        return;
      }
      const raw = sourceNode.value;
      const value = typeof raw === 'string' ? raw : null;
      if (value === null) {
        return;
      }
      if (!/^\.\.?\//.test(value)) {
        return;
      }

      const expected = expectedNodeNextSpecifier(fromFile, value);
      if (expected === null) {
        return;
      }
      if (expected === value) {
        return;
      }

      const messageId = /\.(ts|tsx)(\?|$)/.test(value) ? 'useJsNotTs' : 'needJs';

      context.report({
        node: sourceNode,
        messageId,
        data: { path: value, expected },
        fix(fixer) {
          return fixer.replaceText(sourceNode, replaceSpecifier(sourceNode, expected));
        },
      });
    }

    return {
      ImportDeclaration(node) {
        checkLiteral(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkLiteral(node.source);
        }
      },
      ExportAllDeclaration(node) {
        checkLiteral(node.source);
      },
      ImportExpression(node) {
        const src = node.source;
        if (src && src.type === 'Literal') {
          checkLiteral(src);
        }
      },
    };
  },
};
