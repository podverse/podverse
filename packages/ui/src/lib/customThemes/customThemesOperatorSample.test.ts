import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseRemoteThemePack } from './customThemes.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../../..');
const themesScssPath = path.join(repoRoot, 'packages/ui/src/styles/_themes.scss');
const operatorSamplePath = path.join(
  repoRoot,
  'docs/operations/branding/custom-themes.operator-sample.json'
);

function readThemeCssVariableKeysFromThemesScss(): string[] {
  const scss = readFileSync(themesScssPath, 'utf8');
  const start = scss.indexOf(':root,');
  const end = scss.indexOf('// Light theme');
  const darkSection = scss.slice(start, end);
  const keys = [...darkSection.matchAll(/^\s+(--[a-z-]+):/gm)].map((match) => match[1]);
  return [...new Set(keys)];
}

describe('customThemes operator sample', () => {
  it('parses and includes every theme CSS variable from _themes.scss', () => {
    const expectedKeys = readThemeCssVariableKeysFromThemesScss();
    expect(expectedKeys.length).toBeGreaterThan(0);

    const rawJson: unknown = JSON.parse(readFileSync(operatorSamplePath, 'utf8'));
    const parsedPack = parseRemoteThemePack(rawJson);
    expect(parsedPack).toBeDefined();
    if (parsedPack === undefined) {
      return;
    }

    expect(parsedPack.themes).toHaveLength(3);

    for (const theme of parsedPack.themes) {
      const actualKeys = Object.keys(theme.cssVariables).sort();
      expect(actualKeys).toEqual([...expectedKeys].sort());
    }
  });
});
