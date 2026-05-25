export type TracesExportMode = 'none' | 'otlp';

export type ObservabilityConfig = {
  serviceName: string;
  tracesExport: TracesExportMode;
  otlpEndpoint?: string;
  sampler?: string;
  samplerArg?: string;
};

export type ObservabilityStartupValidationResult = {
  name: string;
  isSet: boolean;
  isValid: boolean;
  isRequired: boolean;
  message: string;
  category: 'Observability';
};

const OBSERVABILITY_CATEGORY = 'Observability' as const;

const trimEnv = (value: string | undefined): string | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return value.trim();
};

export const isTracesExportMode = (value: string): value is TracesExportMode => {
  return value === 'none' || value === 'otlp';
};

export const buildObservabilityConfigFromEnv = (env: NodeJS.ProcessEnv): ObservabilityConfig => {
  const tracesExportRaw = env.OTEL_TRACES_EXPORT;
  const tracesExport: TracesExportMode = tracesExportRaw === 'otlp' ? 'otlp' : 'none';

  return {
    serviceName: env.OTEL_SERVICE_NAME?.trim() ?? '',
    tracesExport,
    otlpEndpoint: trimEnv(env.OTEL_EXPORTER_OTLP_ENDPOINT),
    sampler: trimEnv(env.OTEL_TRACES_SAMPLER),
    samplerArg: trimEnv(env.OTEL_TRACES_SAMPLER_ARG),
  };
};

export const validateObservabilityConfig = (config: ObservabilityConfig): void => {
  if (config.serviceName.trim() === '') {
    throw new Error('OTEL_SERVICE_NAME is required');
  }
  if (!isTracesExportMode(config.tracesExport)) {
    throw new Error('OTEL_TRACES_EXPORT must be "none" or "otlp"');
  }
  if (config.tracesExport === 'otlp' && !config.otlpEndpoint) {
    throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_TRACES_EXPORT=otlp');
  }
};

export const validateObservabilityConfigFromEnv = (env: NodeJS.ProcessEnv): void => {
  validateObservabilityConfig(buildObservabilityConfigFromEnv(env));
};

export const buildObservabilityValidationResults = (
  env: NodeJS.ProcessEnv
): ObservabilityStartupValidationResult[] => {
  const results: ObservabilityStartupValidationResult[] = [];
  const serviceName = trimEnv(env.OTEL_SERVICE_NAME);
  results.push({
    name: 'OTEL_SERVICE_NAME',
    isSet: serviceName !== undefined,
    isValid: serviceName !== undefined,
    isRequired: true,
    message: serviceName !== undefined ? `Set to "${serviceName}"` : 'Missing or empty',
    category: OBSERVABILITY_CATEGORY,
  });

  const tracesExportRaw = trimEnv(env.OTEL_TRACES_EXPORT);
  const tracesExportValid = tracesExportRaw !== undefined && isTracesExportMode(tracesExportRaw);
  results.push({
    name: 'OTEL_TRACES_EXPORT',
    isSet: tracesExportRaw !== undefined,
    isValid: tracesExportValid,
    isRequired: true,
    message: tracesExportValid
      ? `Set to "${tracesExportRaw}"`
      : tracesExportRaw === undefined
        ? 'Missing or empty'
        : `Invalid value: "${tracesExportRaw}" - must be "none" or "otlp"`,
    category: OBSERVABILITY_CATEGORY,
  });

  const otlpEndpoint = trimEnv(env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const otlpRequired = tracesExportRaw === 'otlp';
  results.push({
    name: 'OTEL_EXPORTER_OTLP_ENDPOINT',
    isSet: otlpEndpoint !== undefined,
    isValid: !otlpRequired || otlpEndpoint !== undefined,
    isRequired: otlpRequired,
    message: otlpRequired
      ? otlpEndpoint !== undefined
        ? 'Set'
        : 'Required when OTEL_TRACES_EXPORT=otlp'
      : tracesExportRaw === 'none'
        ? 'Skipped (traces export disabled)'
        : 'Skipped',
    category: OBSERVABILITY_CATEGORY,
  });

  const sampler = trimEnv(env.OTEL_TRACES_SAMPLER);
  results.push({
    name: 'OTEL_TRACES_SAMPLER',
    isSet: sampler !== undefined,
    isValid: true,
    isRequired: false,
    message: sampler !== undefined ? `Set to "${sampler}"` : 'Skipped',
    category: OBSERVABILITY_CATEGORY,
  });

  const samplerArg = trimEnv(env.OTEL_TRACES_SAMPLER_ARG);
  results.push({
    name: 'OTEL_TRACES_SAMPLER_ARG',
    isSet: samplerArg !== undefined,
    isValid: true,
    isRequired: false,
    message: samplerArg !== undefined ? `Set to "${samplerArg}"` : 'Skipped',
    category: OBSERVABILITY_CATEGORY,
  });

  return results;
};
