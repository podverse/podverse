#!/usr/bin/env node
// Plan helper for the list milestones. Moves whole-line blocks from one file into
// `// @@SLOT:<NAME>@@` markers in another, located by exact line-prefix anchors; applies exact
// text edits from an edits file; and lists imports a file no longer references. Run from the
// monorepo root through the Nix wrapper:
//
//   ./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs move <spec.json>
//   ./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs apply-edits <file.edits>
//   ./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs unused-imports <file> [file…]
//
// Edits file: blocks of directive lines (starting "@@ ") and verbatim text lines.
//
//   @@ edit <label>              replace one exact run of whole lines, found exactly once
//   @@ file <path>
//   @@ find
//   <lines>
//   @@ replace
//   <lines, or none to delete>
//   @@ end
//
//   @@ lines <label>             replace a line range
//   @@ file <path>
//   @@ from <exact line>         or "@@ from-start" for the first line of the file
//   @@ through <exact line>      inclusive; or "@@ up-to <exact line>" to stop before it
//   @@ drop-blank-after          optional: also remove one blank line after the range
//   @@ replace
//   <lines, or none to delete>
//   @@ end
//
// `from` must equal exactly one line; `through` / `up-to` is the first later line equal to the
// text. Edits run in order. Nothing is written when any edit fails.
//
// Spec shape:
//   {
//     "source": "apps/mobile/src/…/Screen.tsx",
//     "target": "apps/mobile/src/…/List.tsx",
//     "slots": {
//       "MODULE": [{ "from": "type Foo = {", "fromOffset": -1, "to": "export function Screen() {" }],
//       "BODY": [{ "from": "  const [rows, setRows]", "to": "  const { sheet } = useSheet();" }]
//     }
//   }
//
// `from` must match the start of exactly one source line. `to` is the first line after `from` that
// starts with that text; the block stops before it. `fromOffset` (zero or negative) widens the
// block upward, for a doc comment above the anchor. Blocks land in each slot in listed order and
// are removed from the source. Nothing is written when any anchor fails.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const USAGE = [
  'Usage:',
  '  node move-blocks.mjs move <spec.json>',
  '  node move-blocks.mjs apply-edits <file.edits>',
  '  node move-blocks.mjs unused-imports <file> [file…]',
].join('\n');

function fail(message) {
  console.error(`move-blocks: ${message}`);
  process.exit(1);
}

function findUnique(lines, prefix, label) {
  const hits = [];
  lines.forEach((line, index) => {
    if (line.startsWith(prefix)) {
      hits.push(index);
    }
  });
  if (hits.length !== 1) {
    const where = hits.length > 0 ? ` (lines ${hits.map((index) => index + 1).join(', ')})` : '';
    fail(`${label}: expected one line starting with ${JSON.stringify(prefix)}, found ${hits.length}${where}`);
  }
  return hits[0];
}

function findAfter(lines, prefix, after, label) {
  for (let index = after + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith(prefix)) {
      return index;
    }
  }
  fail(`${label}: no line starting with ${JSON.stringify(prefix)} after line ${after + 1}`);
  return -1;
}

function collapseBlankRuns(lines) {
  const out = [];
  for (const line of lines) {
    if (line.trim() === '' && out.length > 0 && out[out.length - 1].trim() === '') {
      continue;
    }
    out.push(line);
  }
  return out;
}

function runMove(specPath) {
  if (specPath === undefined) {
    fail(`missing spec path\n${USAGE}`);
  }
  const root = process.cwd();
  const spec = JSON.parse(readFileSync(resolve(root, specPath), 'utf8'));
  const sourcePath = resolve(root, spec.source);
  const targetPath = resolve(root, spec.target);
  const sourceLines = readFileSync(sourcePath, 'utf8').split('\n');
  let targetText = readFileSync(targetPath, 'utf8');

  const ranges = [];
  for (const [slot, blocks] of Object.entries(spec.slots)) {
    blocks.forEach((block, blockIndex) => {
      const label = `${slot}[${blockIndex}]`;
      const anchor = findUnique(sourceLines, block.from, `${label}.from`);
      const offset = block.fromOffset ?? 0;
      if (offset > 0) {
        fail(`${label}: fromOffset must be zero or negative`);
      }
      const start = anchor + offset;
      if (start < 0) {
        fail(`${label}: fromOffset reaches before the start of the file`);
      }
      const end = findAfter(sourceLines, block.to, anchor, `${label}.to`);
      ranges.push({ end, label, slot, start });
    });
  }

  const byStart = ranges.slice().sort((a, b) => a.start - b.start);
  for (let index = 1; index < byStart.length; index += 1) {
    if (byStart[index].start < byStart[index - 1].end) {
      fail(`${byStart[index - 1].label} and ${byStart[index].label} overlap`);
    }
  }

  for (const slot of Object.keys(spec.slots)) {
    const marker = `// @@SLOT:${slot}@@`;
    const count = targetText.split(marker).length - 1;
    if (count !== 1) {
      fail(`target must contain ${marker} exactly once (found ${count})`);
    }
  }

  for (const slot of Object.keys(spec.slots)) {
    const text = ranges
      .filter((range) => range.slot === slot)
      .map((range) => sourceLines.slice(range.start, range.end).join('\n').replace(/\n+$/, ''))
      .join('\n\n');
    const markerLine = new RegExp(`^[ \\t]*// @@SLOT:${slot}@@[ \\t]*$`, 'm');
    targetText = targetText.replace(markerLine, () => text);
  }

  const remaining = sourceLines.slice();
  for (const range of byStart.slice().reverse()) {
    remaining.splice(range.start, range.end - range.start);
  }

  writeFileSync(targetPath, targetText);
  writeFileSync(sourcePath, collapseBlankRuns(remaining).join('\n'));
  for (const range of ranges) {
    console.log(
      `${range.label}: moved source lines ${range.start + 1}-${range.end} (${range.end - range.start} lines)`
    );
  }
  console.log(`Wrote ${spec.target} and ${spec.source}`);
}

function parseEdits(text, editsPath) {
  const lines = text.split('\n');
  const edits = [];
  let current = null;
  let mode = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const where = `${editsPath}:${index + 1}`;
    if (!line.startsWith('@@ ')) {
      if (mode === 'find') {
        current.find.push(line);
      } else if (mode === 'replace') {
        current.replace.push(line);
      } else if (line.trim() !== '') {
        fail(`${where}: text outside a find or replace section`);
      }
      continue;
    }
    const directive = line.slice(3);
    const [word] = directive.split(' ', 1);
    const value = directive.slice(word.length + 1);
    if (word === 'edit' || word === 'lines') {
      if (current !== null) {
        fail(`${where}: "${current.label}" is missing "@@ end"`);
      }
      current = { find: [], kind: word, label: value, replace: [] };
      mode = null;
    } else if (current === null) {
      fail(`${where}: "@@ ${word}" outside an edit block`);
    } else if (word === 'file') {
      current.file = value;
    } else if (word === 'find') {
      mode = 'find';
    } else if (word === 'replace') {
      mode = 'replace';
      current.hasReplace = true;
    } else if (word === 'from') {
      current.from = value;
    } else if (word === 'from-start') {
      current.fromStart = true;
    } else if (word === 'through') {
      current.through = value;
    } else if (word === 'up-to') {
      current.upTo = value;
    } else if (word === 'drop-blank-after') {
      current.dropBlankAfter = true;
    } else if (word === 'end') {
      if (current.file === undefined || current.hasReplace !== true) {
        fail(`${where}: "${current.label}" needs "@@ file" and "@@ replace"`);
      }
      edits.push(current);
      current = null;
      mode = null;
    } else {
      fail(`${where}: unknown directive "@@ ${word}"`);
    }
  }
  if (current !== null) {
    fail(`${editsPath}: "${current.label}" is missing "@@ end"`);
  }
  return edits;
}

function applyFindEdit(fileLines, edit) {
  const matches = [];
  for (let start = 0; start + edit.find.length <= fileLines.length; start += 1) {
    if (edit.find.every((line, offset) => fileLines[start + offset] === line)) {
      matches.push(start);
    }
  }
  if (edit.find.length === 0 || matches.length !== 1) {
    fail(`edit "${edit.label}" (${edit.file}): expected the find text once, found ${matches.length}`);
  }
  fileLines.splice(matches[0], edit.find.length, ...edit.replace);
}

function applyLinesEdit(fileLines, edit) {
  let start = 0;
  if (edit.fromStart !== true) {
    const hits = [];
    fileLines.forEach((line, index) => {
      if (line === edit.from) {
        hits.push(index);
      }
    });
    if (hits.length !== 1) {
      fail(`lines "${edit.label}" (${edit.file}): expected one line equal to ${JSON.stringify(edit.from)}, found ${hits.length}`);
    }
    start = hits[0];
  }
  const target = edit.through ?? edit.upTo;
  if (target === undefined) {
    fail(`lines "${edit.label}" (${edit.file}): needs "@@ through" or "@@ up-to"`);
  }
  let stop = -1;
  for (let index = start; index < fileLines.length; index += 1) {
    if (fileLines[index] === target) {
      stop = index;
      break;
    }
  }
  if (stop === -1) {
    fail(`lines "${edit.label}" (${edit.file}): no line equal to ${JSON.stringify(target)} after the start`);
  }
  let end = edit.through !== undefined ? stop + 1 : stop;
  if (edit.dropBlankAfter === true && fileLines[end] === '') {
    end += 1;
  }
  fileLines.splice(start, end - start, ...edit.replace);
}

function runApplyEdits(editsPath) {
  if (editsPath === undefined) {
    fail(`missing edits path\n${USAGE}`);
  }
  const root = process.cwd();
  const edits = parseEdits(readFileSync(resolve(root, editsPath), 'utf8'), editsPath);
  const files = new Map();
  for (const edit of edits) {
    if (!files.has(edit.file)) {
      files.set(edit.file, readFileSync(resolve(root, edit.file), 'utf8').split('\n'));
    }
    const fileLines = files.get(edit.file);
    if (edit.kind === 'edit') {
      applyFindEdit(fileLines, edit);
    } else {
      applyLinesEdit(fileLines, edit);
    }
  }
  for (const [file, fileLines] of files) {
    writeFileSync(resolve(root, file), fileLines.join('\n'));
  }
  for (const edit of edits) {
    console.log(`applied ${edit.kind} "${edit.label}" to ${edit.file}`);
  }
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function importedNames(clause) {
  const names = [];
  const withoutType = clause.replace(/^type\s+/, '');
  const braceStart = withoutType.indexOf('{');
  const head = braceStart === -1 ? withoutType : withoutType.slice(0, braceStart);
  const braces = braceStart === -1 ? '' : withoutType.slice(braceStart + 1, withoutType.lastIndexOf('}'));
  for (const part of head.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const star = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(trimmed);
    names.push(star !== null ? star[1] : trimmed);
  }
  for (const part of braces.split(',')) {
    const trimmed = part.trim().replace(/^type\s+/, '');
    if (trimmed.length === 0) {
      continue;
    }
    const alias = /\sas\s+([A-Za-z_$][\w$]*)$/.exec(trimmed);
    names.push(alias !== null ? alias[1] : trimmed);
  }
  return names.filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
}

function runUnusedImports(files) {
  if (files.length === 0) {
    fail(`missing file path\n${USAGE}`);
  }
  const importStatement = /^import\s+([^;]*?)\s+from\s+['"][^'"]+['"];/gm;
  for (const file of files) {
    const text = readFileSync(resolve(process.cwd(), file), 'utf8');
    const names = [];
    for (const match of text.matchAll(importStatement)) {
      names.push(...importedNames(match[1].replace(/\s+/g, ' ').trim()));
    }
    const body = stripComments(text.replace(importStatement, ' '));
    const unused = names.filter((name) => {
      const escaped = name.replace(/\$/g, '\\$');
      return !new RegExp(`(^|[^\\w$])${escaped}([^\\w$]|$)`, 'm').test(body);
    });
    console.log(`${file}: ${unused.length === 0 ? 'no unused imports' : `unused → ${unused.join(', ')}`}`);
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'move') {
  runMove(args[0]);
} else if (command === 'apply-edits') {
  runApplyEdits(args[0]);
} else if (command === 'unused-imports') {
  runUnusedImports(args);
} else {
  fail(USAGE);
}
