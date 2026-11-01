import type { Sampler } from '@opentelemetry/sdk-trace';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace';

import type { ObservabilityConfig } from '../config.js';

const parseRatio = (samplerArg: string | undefined, samplerName: string): number => {
  if (samplerArg === undefined) {
    return 0;
  }
  const ratio = Number(samplerArg);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new Error(
      `OTEL_TRACES_SAMPLER_ARG must be a number between 0 and 1 for sampler "${samplerName}"`
    );
  }
  return ratio;
};

export const createObservabilitySampler = (config: ObservabilityConfig): Sampler | undefined => {
  const samplerName = config.sampler;
  if (samplerName === undefined) {
    return undefined;
  }

  switch (samplerName) {
    case 'always_on':
      return new AlwaysOnSampler();
    case 'always_off':
      return new AlwaysOffSampler();
    case 'traceidratio':
      return new TraceIdRatioBasedSampler(parseRatio(config.samplerArg, samplerName));
    case 'parentbased_always_on':
      return new ParentBasedSampler({ root: new AlwaysOnSampler() });
    case 'parentbased_always_off':
      return new ParentBasedSampler({ root: new AlwaysOffSampler() });
    case 'parentbased_traceidratio':
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(parseRatio(config.samplerArg, samplerName)),
      });
    default:
      throw new Error(
        `Unsupported OTEL_TRACES_SAMPLER "${samplerName}". Supported values: always_on, always_off, traceidratio, parentbased_always_on, parentbased_always_off, parentbased_traceidratio`
      );
  }
};
