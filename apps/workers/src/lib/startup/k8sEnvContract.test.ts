import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { KNOWN_COMMANDS } from '@workers/commands/commandNames.js';
import { describe, expect, it } from 'vitest';

import { getRequiredEnvKeysForCommand } from './validation.js';

/**
 * Every CronJob and Deployment in the base manifests that runs a workers command must mount
 * every env var that command requires at startup. Provided keys come from the kustomize
 * ConfigMap generators, the secret generator scripts (key names only), and literal `env:` entries.
 */

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const K8S_BASE = join(REPO_ROOT, 'infra/k8s/base');
const SECRET_GENERATORS = join(REPO_ROOT, 'infra/k8s/scripts/secret-generators');
const WORKLOAD_DIRS = ['cron', 'ops', 'workers'];
const WORKERS_ENTRY = 'apps/workers/dist/index.js';
/** Secret values never live in the repo; any non-empty value marks the key as provided. */
const SECRET_VALUE_PLACEHOLDER = 'from-secret';

type YamlValue = string | null | YamlValue[] | { [key: string]: YamlValue };
type YamlMap = { [key: string]: YamlValue };

const isYamlMap = (value: YamlValue | undefined): value is YamlMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const yamlList = (value: YamlValue | undefined): YamlValue[] => (Array.isArray(value) ? value : []);

const yamlString = (value: YamlValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const yamlPath = (value: YamlValue | undefined, ...keys: string[]): YamlValue | undefined => {
  let current = value;
  for (const key of keys) {
    if (!isYamlMap(current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
};

/**
 * Reads the block-style YAML subset the k8s manifests use: mappings, sequences, quoted and plain
 * scalars, flow sequences of scalars, and `|` / `>` block scalars.
 */
class YamlSubsetReader {
  private readonly lines: string[];
  private index = 0;

  constructor(source: string) {
    this.lines = source.split('\n');
  }

  read(): YamlValue {
    const next = this.peek();
    return next === undefined ? null : this.readBlock(next.indent);
  }

  private peek(): { indent: number; text: string } | undefined {
    while (this.index < this.lines.length) {
      const line = this.lines[this.index] ?? '';
      const text = line.trim();
      if (text !== '' && !text.startsWith('#')) {
        return { indent: line.length - line.trimStart().length, text };
      }
      this.index += 1;
    }
    return undefined;
  }

  private readBlock(indent: number): YamlValue {
    const next = this.peek();
    if (next === undefined) {
      return null;
    }
    return next.text === '-' || next.text.startsWith('- ')
      ? this.readSequence(indent)
      : this.readMapping(indent);
  }

  private readMapping(indent: number): YamlMap {
    const map: YamlMap = {};
    for (let next = this.peek(); next !== undefined; next = this.peek()) {
      if (next.indent !== indent || next.text === '-' || next.text.startsWith('- ')) {
        break;
      }
      const entry = /^("[^"]*"|'[^']*'|[^\s"'][^:]*?):(?:\s+(.*))?$/.exec(next.text);
      this.index += 1;
      if (!entry) {
        continue;
      }
      const key = unquote(entry[1] ?? '');
      map[key] = this.readValue(entry[2] ?? '', indent, true);
    }
    return map;
  }

  private readSequence(indent: number): YamlValue[] {
    const list: YamlValue[] = [];
    for (let next = this.peek(); next !== undefined; next = this.peek()) {
      if (next.indent !== indent || !(next.text === '-' || next.text.startsWith('- '))) {
        break;
      }
      const itemText = next.text.slice(1).trimStart();
      if (/^("[^"]*"|'[^']*'|[^\s"'[{|>][^:]*?):(\s|$)/.test(itemText)) {
        const itemIndent = indent + (next.text.length - itemText.length);
        this.lines[this.index] = `${' '.repeat(itemIndent)}${itemText}`;
        list.push(this.readMapping(itemIndent));
        continue;
      }
      this.index += 1;
      list.push(this.readValue(itemText, indent, false));
    }
    return list;
  }

  private readValue(raw: string, parentIndent: number, inMapping: boolean): YamlValue {
    const text = stripComment(raw);
    if (text === '') {
      const next = this.peek();
      if (next === undefined) {
        return null;
      }
      if (next.indent > parentIndent) {
        return this.readBlock(next.indent);
      }
      const isSequence = next.text === '-' || next.text.startsWith('- ');
      return inMapping && next.indent === parentIndent && isSequence
        ? this.readSequence(parentIndent)
        : null;
    }
    if (text.startsWith('|') || text.startsWith('>')) {
      return this.readBlockScalar(parentIndent);
    }
    if (text.startsWith('[')) {
      return readFlowSequence(text);
    }
    if (text.startsWith('{')) {
      return {};
    }
    return unquote(text);
  }

  private readBlockScalar(parentIndent: number): string {
    const body: string[] = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index] ?? '';
      const indent = line.length - line.trimStart().length;
      if (line.trim() !== '' && indent <= parentIndent) {
        break;
      }
      body.push(line.trim());
      this.index += 1;
    }
    return body.join('\n');
  }
}

function unquote(text: string): string {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

function stripComment(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return trimmed;
  }
  const commentAt = trimmed.search(/\s#/);
  return commentAt === -1 ? trimmed : trimmed.slice(0, commentAt).trim();
}

function readFlowSequence(text: string): string[] {
  const inner = text.slice(1, text.lastIndexOf(']'));
  return [...inner.matchAll(/"([^"]*)"|'([^']*)'|([^,\s][^,]*)/g)].map((match) =>
    (match[1] ?? match[2] ?? match[3] ?? '').trim()
  );
}

function readYamlDocuments(path: string): YamlValue[] {
  return readFileSync(path, 'utf8')
    .split(/^---\s*$/m)
    .map((document) => new YamlSubsetReader(document).read())
    .filter((document) => document !== null);
}

function readEnvFile(path: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const text = line.trim();
    const equalsAt = text.indexOf('=');
    if (text === '' || text.startsWith('#') || equalsAt <= 0) {
      continue;
    }
    values.set(text.slice(0, equalsAt), text.slice(equalsAt + 1));
  }
  return values;
}

/** ConfigMap name → keys and values, from every `configMapGenerator` under the base tree. */
function readConfigMaps(): Map<string, Map<string, string>> {
  const configMaps = new Map<string, Map<string, string>>();
  const kustomizations = readdirSync(K8S_BASE, { recursive: true, encoding: 'utf8' }).filter(
    (path) => basename(path) === 'kustomization.yaml'
  );
  for (const relativePath of kustomizations) {
    const kustomizationPath = join(K8S_BASE, relativePath);
    const kustomizationDir = dirname(kustomizationPath);
    for (const document of readYamlDocuments(kustomizationPath)) {
      for (const generator of yamlList(yamlPath(document, 'configMapGenerator'))) {
        const name = yamlString(yamlPath(generator, 'name'));
        if (name === undefined) {
          continue;
        }
        const values = configMaps.get(name) ?? new Map<string, string>();
        for (const envPath of yamlList(yamlPath(generator, 'envs'))) {
          if (typeof envPath === 'string') {
            for (const [key, value] of readEnvFile(join(kustomizationDir, envPath))) {
              values.set(key, value);
            }
          }
        }
        for (const literal of yamlList(yamlPath(generator, 'literals'))) {
          const equalsAt = typeof literal === 'string' ? literal.indexOf('=') : -1;
          if (typeof literal === 'string' && equalsAt > 0) {
            values.set(literal.slice(0, equalsAt), literal.slice(equalsAt + 1));
          }
        }
        for (const file of yamlList(yamlPath(generator, 'files'))) {
          if (typeof file === 'string') {
            const equalsAt = file.indexOf('=');
            values.set(equalsAt > 0 ? file.slice(0, equalsAt) : basename(file), 'file');
          }
        }
        configMaps.set(name, values);
      }
    }
  }
  return configMaps;
}

/** Secret name → key names, from the `kubectl create secret` call in each generator script. */
function readSecretKeys(): Map<string, Set<string>> {
  const secrets = new Map<string, Set<string>>();
  for (const script of readdirSync(SECRET_GENERATORS).filter((name) => name.endsWith('.sh'))) {
    const source = readFileSync(join(SECRET_GENERATORS, script), 'utf8');
    const names = [...source.matchAll(/^\s*SECRET_NAME="([^"$]+)"\s*$/gm)].map(
      (match) => match[1] ?? ''
    );
    const [name] = names;
    if (names.length !== 1 || name === undefined) {
      continue;
    }
    const keys = new Set<string>();
    for (const match of source.matchAll(/--from-(?:literal|file)=([A-Za-z0-9_.-]+)/g)) {
      keys.add(match[1] ?? '');
    }
    secrets.set(name, keys);
  }
  return secrets;
}

type WorkerWorkload = {
  label: string;
  commandName: string;
  flags: string[];
  container: YamlMap;
};

function readWorkerWorkloads(): WorkerWorkload[] {
  const workloads: WorkerWorkload[] = [];
  for (const dir of WORKLOAD_DIRS) {
    const files = readdirSync(join(K8S_BASE, dir)).filter(
      (name) => name.endsWith('.yaml') && name !== 'kustomization.yaml'
    );
    for (const file of files) {
      for (const document of readYamlDocuments(join(K8S_BASE, dir, file))) {
        const kind = yamlString(yamlPath(document, 'kind'));
        const podSpec =
          kind === 'CronJob'
            ? yamlPath(document, 'spec', 'jobTemplate', 'spec', 'template', 'spec')
            : kind === 'Deployment'
              ? yamlPath(document, 'spec', 'template', 'spec')
              : undefined;
        const name = yamlString(yamlPath(document, 'metadata', 'name')) ?? file;
        for (const container of yamlList(yamlPath(podSpec, 'containers'))) {
          if (!isYamlMap(container)) {
            continue;
          }
          const argv = [...yamlList(container.command), ...yamlList(container.args)].filter(
            (part): part is string => typeof part === 'string'
          );
          const entryAt = argv.indexOf(WORKERS_ENTRY);
          if (entryAt === -1) {
            continue;
          }
          workloads.push({
            label: `${kind ?? 'workload'} ${name} (${dir}/${file})`,
            commandName: argv[entryAt + 1] ?? '',
            flags: argv.slice(entryAt + 2),
            container,
          });
        }
      }
    }
  }
  return workloads;
}

type ProvidedEnv = { env: Record<string, string>; problems: string[] };

/** Env the container receives, in Kubernetes precedence order: `envFrom` in order, then `env`. */
function readProvidedEnv(
  container: YamlMap,
  configMaps: Map<string, Map<string, string>>,
  secrets: Map<string, Set<string>>
): ProvidedEnv {
  const env: Record<string, string> = {};
  const problems: string[] = [];

  for (const source of yamlList(container.envFrom)) {
    const prefix = yamlString(yamlPath(source, 'prefix')) ?? '';
    const configMapName = yamlString(yamlPath(source, 'configMapRef', 'name'));
    const secretName = yamlString(yamlPath(source, 'secretRef', 'name'));
    if (configMapName !== undefined) {
      const values = configMaps.get(configMapName);
      if (values === undefined) {
        problems.push(`ConfigMap ${configMapName} has no configMapGenerator in infra/k8s/base`);
        continue;
      }
      for (const [key, value] of values) {
        env[`${prefix}${key}`] = value;
      }
    }
    if (secretName !== undefined) {
      const keys = secrets.get(secretName);
      if (keys === undefined) {
        problems.push(`Secret ${secretName} has no generator script`);
        continue;
      }
      for (const key of keys) {
        env[`${prefix}${key}`] = SECRET_VALUE_PLACEHOLDER;
      }
    }
  }

  for (const entry of yamlList(container.env)) {
    const name = yamlString(yamlPath(entry, 'name'));
    if (name === undefined) {
      continue;
    }
    const literal = yamlString(yamlPath(entry, 'value'));
    const secretName = yamlString(yamlPath(entry, 'valueFrom', 'secretKeyRef', 'name'));
    const secretKey = yamlString(yamlPath(entry, 'valueFrom', 'secretKeyRef', 'key'));
    const configMapName = yamlString(yamlPath(entry, 'valueFrom', 'configMapKeyRef', 'name'));
    const configMapKey = yamlString(yamlPath(entry, 'valueFrom', 'configMapKeyRef', 'key'));
    if (secretName !== undefined && secretKey !== undefined) {
      if (secrets.get(secretName)?.has(secretKey)) {
        env[name] = SECRET_VALUE_PLACEHOLDER;
      } else {
        problems.push(`env ${name} reads key ${secretKey} that Secret ${secretName} does not hold`);
      }
    } else if (configMapName !== undefined && configMapKey !== undefined) {
      const value = configMaps.get(configMapName)?.get(configMapKey);
      if (value !== undefined) {
        env[name] = value;
      } else {
        problems.push(
          `env ${name} reads key ${configMapKey} that ConfigMap ${configMapName} does not hold`
        );
      }
    } else {
      env[name] = literal ?? '';
    }
  }

  return { env, problems };
}

describe('k8s env contract for workers commands', () => {
  const configMaps = readConfigMaps();
  const secrets = readSecretKeys();
  const workloads = readWorkerWorkloads();

  const requiredKeysFor = (label: string): string[] => {
    const workload = workloads.find((candidate) => candidate.label.includes(` ${label} `));
    if (workload === undefined) {
      throw new Error(`No worker workload named ${label}`);
    }
    const { env } = readProvidedEnv(workload.container, configMaps, secrets);
    return getRequiredEnvKeysForCommand(workload.commandName, env, workload.flags);
  };

  it('reads the CronJobs and Deployments that run workers commands', () => {
    expect(workloads.map((workload) => workload.label)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^CronJob worker-account-session-purge /),
        expect.stringMatching(/^Deployment worker-parser-add-by-rss-ondemand /),
      ])
    );
  });

  it('runs only known workers commands', () => {
    const unknown = workloads
      .filter((workload) => !KNOWN_COMMANDS.includes(workload.commandName))
      .map((workload) => `${workload.label} runs unknown command "${workload.commandName}"`);
    expect(unknown).toEqual([]);
  });

  it('requires the Add by RSS key only where credentials are opened', () => {
    const key = 'ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY';
    expect(requiredKeysFor('worker-parser-add-by-rss-ondemand')).toContain(key);
    expect(requiredKeysFor('worker-account-session-purge')).not.toContain(key);
  });

  it('mounts every env var each workers command requires', () => {
    const findings = workloads.flatMap((workload) => {
      const { env, problems } = readProvidedEnv(workload.container, configMaps, secrets);
      const required = getRequiredEnvKeysForCommand(workload.commandName, env, workload.flags);
      const missing = required.filter((key) => env[key] === undefined);
      const workloadFindings = problems.map((problem) => `${workload.label}: ${problem}`);
      if (missing.length > 0) {
        workloadFindings.push(
          `${workload.label} runs ${workload.commandName} and does not mount: ${missing.join(', ')}`
        );
      }
      return workloadFindings;
    });
    expect(findings).toEqual([]);
  });
});
