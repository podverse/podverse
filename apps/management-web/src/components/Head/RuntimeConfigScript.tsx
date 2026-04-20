import { buildRuntimeConfigScript } from '@podverse/helpers-browser';

import type { ManagementWebRuntimeConfig } from '../../config/runtime-config';

export default function RuntimeConfigScript({
  runtimeConfig,
}: {
  runtimeConfig: ManagementWebRuntimeConfig;
}) {
  const script = buildRuntimeConfigScript(runtimeConfig, '__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__');
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
