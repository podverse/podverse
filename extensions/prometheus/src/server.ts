/* eslint-disable no-console */
import http from 'node:http';

import { loadExtensionPrometheusConfig } from './config.js';
import { startOtelcolProcess } from './otelcolProcess.js';
import { fetchPrometheusMetricsText } from './prometheusProxy.js';
import { createExtensionPrometheusRequestListener } from './requestListener.js';

const main = async (): Promise<void> => {
  const config = loadExtensionPrometheusConfig();
  const otelcol = await startOtelcolProcess(config);

  const server = http.createServer(
    createExtensionPrometheusRequestListener(config, { fetchPrometheusMetricsText })
  );

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Shutting down (${signal})...`);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await otelcol.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  server.listen(config.metricsPort, '0.0.0.0', () => {
    console.log(
      `extension-prometheus listening on :${config.metricsPort} (health=${config.healthPath}, metrics=${config.metricsPath}, otlp=:${config.otlpHttpPort})`
    );
  });
};

main().catch((error) => {
  console.error('extension-prometheus failed to start:', error);
  process.exit(1);
});
