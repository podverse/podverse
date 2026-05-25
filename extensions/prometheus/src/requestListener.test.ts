import http from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import type { ExtensionPrometheusConfig } from './config.js';
import { createExtensionPrometheusRequestListener } from './requestListener.js';

const testConfig: ExtensionPrometheusConfig = {
  metricsPort: 9464,
  metricsPath: '/extensions/prometheus/metrics',
  healthPath: '/extensions/prometheus/health',
  otlpHttpPort: 4318,
  collectProcessMetrics: true,
  otelcolBinaryPath: '/usr/local/bin/otelcol-contrib',
  prometheusInternalMetricsUrl: 'http://127.0.0.1:8889/metrics',
};

const request = (
  server: http.Server,
  path: string,
  method = 'GET'
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    if (address === null || typeof address === 'string') {
      reject(new Error('expected server address object'));
      return;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
};

describe('createExtensionPrometheusRequestListener', () => {
  let server: http.Server | null = null;

  afterEach(async () => {
    if (server !== null) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      server = null;
    }
  });

  it('returns 200 JSON for health path', async () => {
    server = http.createServer(
      createExtensionPrometheusRequestListener(testConfig, {
        fetchPrometheusMetricsText: async () => '# TYPE up gauge\n',
      })
    );

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const response = await request(server, testConfig.healthPath);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('returns 200 text/plain for metrics path', async () => {
    server = http.createServer(
      createExtensionPrometheusRequestListener(testConfig, {
        fetchPrometheusMetricsText: async () => '# HELP http_requests_total\n',
      })
    );

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const response = await request(server, testConfig.metricsPath);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('http_requests_total');
  });

  it('returns 503 when metrics proxy fails', async () => {
    server = http.createServer(
      createExtensionPrometheusRequestListener(testConfig, {
        fetchPrometheusMetricsText: async () => {
          throw new Error('collector down');
        },
      })
    );

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const response = await request(server, testConfig.metricsPath);
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ status: 'error', message: 'collector down' });
  });

  it('returns 404 for unknown paths', async () => {
    server = http.createServer(
      createExtensionPrometheusRequestListener(testConfig, {
        fetchPrometheusMetricsText: async () => '',
      })
    );

    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });

    const response = await request(server, '/unknown');
    expect(response.statusCode).toBe(404);
  });
});
