import type { WebRuntimeConfig } from '../../config/runtime-config';

const serializeRuntimeConfig = (runtimeConfig: WebRuntimeConfig): string =>
  JSON.stringify(runtimeConfig).replace(/</g, '\\u003c');

const buildRuntimeConfigScript = (runtimeConfig: WebRuntimeConfig): string =>
  `globalThis.__PODVERSE_RUNTIME_CONFIG__ = ${serializeRuntimeConfig(runtimeConfig)};`;

export default function RuntimeConfigScript({
  runtimeConfig,
}: {
  runtimeConfig: WebRuntimeConfig;
}) {
  const script = buildRuntimeConfigScript(runtimeConfig);
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
