import { RuntimeConfigScript as SharedRuntimeConfigScript } from '@podverse/ui';

import type { ManagementWebRuntimeConfig } from '../../config/runtime-config';

export default function RuntimeConfigScript({
  runtimeConfig,
}: {
  runtimeConfig: ManagementWebRuntimeConfig;
}) {
  return (
    <SharedRuntimeConfigScript
      runtimeConfig={runtimeConfig}
      globalThisProperty="__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__"
    />
  );
}
