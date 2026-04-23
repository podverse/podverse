import { buildRuntimeConfigScript } from '@podverse/helpers-browser';

import type { WebRuntimeConfig } from '../../config/runtime-config';

export default function RuntimeConfigScript({
  runtimeConfig,
}: {
  runtimeConfig: WebRuntimeConfig;
}) {
  const script = buildRuntimeConfigScript(runtimeConfig, '__PODVERSE_RUNTIME_CONFIG__');
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
