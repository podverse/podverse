## OpenTelemetry SDK 3 for tracing and metrics

- Surfaces: observability, extension-metrics-sdk
- Change: Align `@podverse/observability` and `@podverse/extension-metrics-sdk` on OpenTelemetry SDK 3 (`@opentelemetry/api` 1.10, stable SDK packages 3.0, OTLP exporters 0.300). Tracing setup uses `@opentelemetry/sdk-trace` with manual global registration. `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` are applied in code when set.
- Who notices: operators exporting OTLP traces or extension metrics; sampler env vars now take effect
- Operator steps: none beyond normal deploy; keep Node >= 22.15 (repo already requires 24+)
