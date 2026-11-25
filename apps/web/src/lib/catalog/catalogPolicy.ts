import type { CatalogConfig } from '@podverse/helpers-config';

import { getConfig } from '../../config';

/** Server components, route handlers, and metadata: read per request, never at module scope. */
export const getCatalogConfig = (): CatalogConfig => getConfig().public.catalog;
