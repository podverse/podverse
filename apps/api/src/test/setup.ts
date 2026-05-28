/**
 * Vitest setup: set test env before any module that reads process.env is loaded.
 * Canonical values: @podverse/helpers-config `buildPodverseApiTestEnv({ profile: 'apiVitest' })`.
 */

import { applyPodverseTestEnv, buildPodverseApiTestEnv } from '@podverse/helpers-config';

applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
