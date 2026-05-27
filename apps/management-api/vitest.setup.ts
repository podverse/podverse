import 'reflect-metadata';

import { applyPodverseTestEnv, buildPodverseManagementApiTestEnv } from '@podverse/helpers-config';
import { initObservability } from '@podverse/observability';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

applyPodverseTestEnv(buildPodverseManagementApiTestEnv({ profile: 'managementApiVitest' }));

initObservability(buildObservabilityConfigFromEnv(process.env));
