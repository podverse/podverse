import type { ManagementWebRuntimeConfig } from '../../config/runtime-config';

const serializeRuntimeConfig = (runtimeConfig: ManagementWebRuntimeConfig): string =>
  JSON.stringify(runtimeConfig).replace(/</g, '\\u003c');

const buildRuntimeConfigScript = (runtimeConfig: ManagementWebRuntimeConfig): string =>
  `globalThis.__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__ = ${serializeRuntimeConfig(runtimeConfig)};`;

export default function RuntimeConfigScript({
  runtimeConfig,
}: {
  runtimeConfig: ManagementWebRuntimeConfig;
}) {
  const script = buildRuntimeConfigScript(runtimeConfig);
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
