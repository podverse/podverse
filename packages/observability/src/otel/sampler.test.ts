import { describe, expect, it } from 'vitest';

import { createObservabilitySampler } from './sampler.js';

describe('createObservabilitySampler', () => {
  it('returns undefined when sampler is unset', () => {
    expect(
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
      })
    ).toBeUndefined();
  });

  it('builds always_on and always_off samplers', () => {
    expect(
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
        sampler: 'always_on',
      })?.toString()
    ).toContain('AlwaysOn');
    expect(
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
        sampler: 'always_off',
      })?.toString()
    ).toContain('AlwaysOff');
  });

  it('builds ratio samplers from samplerArg', () => {
    expect(
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
        sampler: 'traceidratio',
        samplerArg: '0.25',
      })?.toString()
    ).toContain('0.25');
    expect(
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
        sampler: 'parentbased_traceidratio',
        samplerArg: '0.5',
      })?.toString()
    ).toContain('ParentBased');
  });

  it('throws for an unsupported sampler name', () => {
    expect(() =>
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
        sampler: 'jaeger_remote',
      })
    ).toThrow('Unsupported OTEL_TRACES_SAMPLER');
  });

  it('throws for an invalid ratio arg', () => {
    expect(() =>
      createObservabilitySampler({
        serviceName: 'podverse-test',
        tracesExport: 'none',
        sampler: 'traceidratio',
        samplerArg: '2',
      })
    ).toThrow('OTEL_TRACES_SAMPLER_ARG');
  });
});
