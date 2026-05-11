import readline from 'node:readline';

import { faker } from '@faker-js/faker';

export type MultiConfig =
  | { kind: 'fixed'; value: number }
  | { kind: 'range'; min: number; max: number };

export function parseNumericArg(flag: string, defaultVal: number, argv: string[]): MultiConfig {
  const idx = argv.indexOf(flag);
  const value = argv[idx + 1];
  if (idx === -1 || value === undefined) {
    return { kind: 'fixed', value: defaultVal };
  }
  const rangeMatch = value.match(/^(\d+)-(\d+)$/);
  if (rangeMatch && rangeMatch[1] !== undefined && rangeMatch[2] !== undefined) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min >= 1 && max >= min) {
      return { kind: 'range', min, max };
    }
  }
  const n = parseInt(value, 10);
  if (!Number.isNaN(n) && n >= 1) {
    return { kind: 'fixed', value: n };
  }
  return { kind: 'fixed', value: defaultVal };
}

export function getValueFromConfig(config: MultiConfig): number {
  if (config.kind === 'fixed') return config.value;
  return faker.number.int({ min: config.min, max: config.max });
}

/** Returns true if user types y (case-insensitive), false otherwise. Exported for generate_and_parse. */
export function confirmAddFakeValueTags(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      'WARNING: This will generate value tags with fake information. You should NOT use these value tags to send money to, or your money will be lost.\nType y to continue, or any other key to quit.\n',
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y');
      }
    );
  });
}

export function getPositionalCount(argv: string[]): number | null {
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--multi' || arg === '--items') {
      i++;
      continue;
    }
    if (arg === '--force-rss' || arg === '--add-fake-value-tags') continue;
    positionals.push(arg);
  }
  const first = positionals[0];
  if (!first) return null;
  const n = parseInt(first, 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
}
