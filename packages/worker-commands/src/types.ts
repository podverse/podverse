/**
 * `long_running` — long-lived MQ consumers; `dev_only` — development / bulk helpers.
 */
export type WorkerCommandRisk = 'normal' | 'long_running' | 'dev_only';

export type WorkerCommandCategory =
  | 'billing'
  | 'archival'
  | 'on_demand_parser'
  | 'image'
  | 'mq'
  | 'orm'
  | 'parser'
  | 'podcast_index'
  | 'stats'
  | 'dev';

export type WorkerCommandDef = {
  name: string;
  label: string;
  description: string;
  category: WorkerCommandCategory;
  risk: WorkerCommandRisk;
  /** Monorepo root, after `build:packages` and `npm run build -w apps/workers` (see `apps/workers/APPS-WORKERS.md`) */
  example_cli: string;
  /** When set, management-web can link to this in-app path (e.g. feed status workflow) */
  related_management_path?: string;
};

export type WorkerCommandListItem = {
  name: string;
  label: string;
  description: string;
  category: WorkerCommandCategory;
  risk: WorkerCommandRisk;
  example_cli: string;
  related_management_path: string | null;
};
