import { RuntimeConfigScript as SharedRuntimeConfigScript } from '@podverse/ui';

import type { WebRuntimeConfig } from '../../config/runtime-config';

export function RuntimeConfigScript({ runtimeConfig }: { runtimeConfig: WebRuntimeConfig }) {
  return (
    <SharedRuntimeConfigScript
      runtimeConfig={runtimeConfig}
      globalThisProperty="__PODVERSE_RUNTIME_CONFIG__"
    />
  );
}
