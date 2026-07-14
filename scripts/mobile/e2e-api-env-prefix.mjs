#!/usr/bin/env node

import {
  buildPodverseApiTestEnv,
  PODVERSE_SKIP_DOTENV_ENV,
  toShellEnvPrefix,
} from '@podverse/helpers-config';

const env = {
  ...buildPodverseApiTestEnv({ profile: 'apiMobileE2e' }),
  ...PODVERSE_SKIP_DOTENV_ENV,
};

process.stdout.write(toShellEnvPrefix(env));
