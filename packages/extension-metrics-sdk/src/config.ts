export type ExtensionInitConfig = {
  metricsExtensionEnabled: boolean;
  otlpEndpoint?: string;
  serviceName?: string;
  resourceAttributes?: string;
};

export type WorkerCommandStatus = 'success' | 'error';
