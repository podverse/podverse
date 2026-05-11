import { ManagementApiRequestService } from '@podverse/management-api-requests';

import { getConfig } from '../../config';

const config = getConfig();
const target = typeof window === 'undefined' ? config.public.api.ssr : config.public.api.client;

ManagementApiRequestService.configureDefaultBase({
  protocol: target.protocol,
  host: target.host,
  port: target.port,
  prefix: config.public.api.prefix,
  version: config.public.api.version,
});
