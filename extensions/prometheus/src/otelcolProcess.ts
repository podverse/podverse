import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { ExtensionPrometheusConfig } from './config.js';
import { buildOtelcolConfigYaml } from './otelcolConfig.js';

const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isCollectorReady = async (internalMetricsUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(internalMetricsUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
};

export type OtelcolProcessHandle = {
  stop: () => Promise<void>;
};

export const startOtelcolProcess = async (
  config: ExtensionPrometheusConfig
): Promise<OtelcolProcessHandle> => {
  const configYaml = buildOtelcolConfigYaml(config);
  const configPath = path.join(os.tmpdir(), `otelcol-config-${process.pid}.yaml`);
  await writeFile(configPath, configYaml, 'utf8');

  const child = spawn(config.otelcolBinaryPath, ['--config', configPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[otelcol] ${chunk.toString()}`);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[otelcol] ${chunk.toString()}`);
  });

  const exitPromise = new Promise<never>((_resolve, reject) => {
    child.on('error', (error) => {
      reject(new Error(`Failed to start OpenTelemetry Collector: ${error.message}`));
    });
    child.on('exit', (code, signal) => {
      reject(
        new Error(
          `OpenTelemetry Collector exited before ready (code=${code ?? 'null'}, signal=${signal ?? 'null'})`
        )
      );
    });
  });

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isCollectorReady(config.prometheusInternalMetricsUrl)) {
      return {
        stop: async () => {
          if (child.killed || child.exitCode !== null) {
            return;
          }
          child.kill('SIGTERM');
          await new Promise<void>((resolve) => {
            child.once('exit', () => resolve());
            setTimeout(() => {
              if (child.exitCode === null) {
                child.kill('SIGKILL');
              }
              resolve();
            }, 5000);
          });
        },
      };
    }
    await sleep(POLL_INTERVAL_MS);
  }

  child.kill('SIGTERM');
  await Promise.race([exitPromise, sleep(2000)]);
  throw new Error(
    `OpenTelemetry Collector did not become ready within ${STARTUP_TIMEOUT_MS}ms (${config.prometheusInternalMetricsUrl})`
  );
};
