#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

HEALTH_URL="${PROMETHEUS_HEALTH_URL:-http://127.0.0.1:9464/extensions/prometheus/health}"
OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-http://127.0.0.1:4318}"

echo "Checking extension-prometheus health: ${HEALTH_URL}"
curl -fsS "$HEALTH_URL" >/dev/null

echo "Exporting test span to ${OTLP_ENDPOINT} (OTEL_TRACES_EXPORT=otlp)..."
./scripts/nix/with-env node --input-type=module <<EOF
import { initObservability, shutdownObservability } from '@podverse/observability';
import { trace } from '@opentelemetry/api';

initObservability({
  serviceName: 'trace-otlp-local-verify',
  tracesExport: 'otlp',
  otlpEndpoint: '${OTLP_ENDPOINT}',
});

const tracer = trace.getTracer('verify-trace-otlp-local');
await tracer.startActiveSpan('verify-trace-otlp-local', async (span) => {
  span.end();
});
await shutdownObservability();
console.log('OK: exported test span');
EOF

echo "OK: trace OTLP local verify completed."
