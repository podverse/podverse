import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ADMIN_SESSION_PURGE_COMMAND, getRequiredEnvKeys } from './validation.js';

/**
 * The admin session purge CronJob runs the management-api image with one command, so it must
 * mount every env var that start requires. Provided keys come from the kustomize ConfigMap
 * generators and the secret generator scripts (key names only).
 */

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const K8S_BASE = join(REPO_ROOT, 'infra/k8s/base');
const SECRET_GENERATORS = join(REPO_ROOT, 'infra/k8s/scripts/secret-generators');
const CRONJOB_PATH = join(K8S_BASE, 'cron/management-api-admin-session-purge.cronjob.yaml');
/** Secret values never live in the repo; any non-empty value marks the key as provided. */
const SECRET_VALUE_PLACEHOLDER = 'from-secret';

function readEnvFile(path: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const text = line.trim();
    const equalsAt = text.indexOf('=');
    if (text !== '' && !text.startsWith('#') && equalsAt > 0) {
      values.set(text.slice(0, equalsAt), text.slice(equalsAt + 1));
    }
  }
  return values;
}

/** ConfigMap name → values, from the `envs` files of each base `configMapGenerator`. */
function readConfigMaps(): Map<string, Map<string, string>> {
  const configMaps = new Map<string, Map<string, string>>();
  const kustomizations = readdirSync(K8S_BASE, { recursive: true, encoding: 'utf8' }).filter(
    (path) => basename(path) === 'kustomization.yaml'
  );
  for (const relativePath of kustomizations) {
    const kustomizationPath = join(K8S_BASE, relativePath);
    let generatorName: string | undefined;
    let inEnvs = false;
    for (const line of readFileSync(kustomizationPath, 'utf8').split('\n')) {
      const nameMatch = /^\s*- name:\s*"?([^"\s]+)"?\s*$/.exec(line);
      const envPathMatch = /^\s*-\s+"?([^"\s]+)"?\s*$/.exec(line);
      if (nameMatch) {
        generatorName = nameMatch[1];
        inEnvs = false;
      } else if (/^\s*envs:\s*$/.test(line)) {
        inEnvs = true;
      } else if (inEnvs && envPathMatch && generatorName !== undefined) {
        const values = configMaps.get(generatorName) ?? new Map<string, string>();
        const envPath = join(dirname(kustomizationPath), envPathMatch[1] ?? '');
        for (const [key, value] of readEnvFile(envPath)) {
          values.set(key, value);
        }
        configMaps.set(generatorName, values);
      } else if (/^\s*[A-Za-z]+:/.test(line)) {
        inEnvs = false;
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
    const keys = [...source.matchAll(/--from-(?:literal|file)=([A-Za-z0-9_.-]+)/g)].map(
      (match) => match[1] ?? ''
    );
    secrets.set(name, new Set(keys));
  }
  return secrets;
}

describe('k8s env contract for the admin session purge CronJob', () => {
  const manifest = readFileSync(CRONJOB_PATH, 'utf8');

  it('runs the admin session purge command', () => {
    const command = /"?apps\/management-api\/dist\/index\.js"?\s*\n\s*-\s*"?([A-Za-z]+)"?/.exec(
      manifest
    );
    expect(command?.[1]).toBe(ADMIN_SESSION_PURGE_COMMAND);
  });

  it('mounts every env var the command requires', () => {
    const configMaps = readConfigMaps();
    const secrets = readSecretKeys();
    const env: Record<string, string> = {};
    const findings: string[] = [];

    const sources = manifest.matchAll(
      /-\s+(configMapRef|secretRef):\s*\n\s+name:\s*"?([^"\s]+)"?/g
    );
    for (const [, kind, name = ''] of sources) {
      if (kind === 'configMapRef') {
        const values = configMaps.get(name);
        if (values === undefined) {
          findings.push(`ConfigMap ${name} has no configMapGenerator in infra/k8s/base`);
        }
        for (const [key, value] of values ?? []) {
          env[key] = value;
        }
      } else {
        const keys = secrets.get(name);
        if (keys === undefined) {
          findings.push(`Secret ${name} has no generator script`);
        }
        for (const key of keys ?? []) {
          env[key] = SECRET_VALUE_PLACEHOLDER;
        }
      }
    }

    const missing = getRequiredEnvKeys(env, ADMIN_SESSION_PURGE_COMMAND).filter(
      (key) => env[key] === undefined
    );
    if (missing.length > 0) {
      findings.push(`management-api-admin-session-purge does not mount: ${missing.join(', ')}`);
    }
    expect(findings).toEqual([]);
  });
});
