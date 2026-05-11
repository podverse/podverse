import { ManagementApiRequestService } from './apiRequestService.js';

export type WorkerCommandRow = {
  name: string;
  label: string;
  description: string;
  category: string;
  risk: 'normal' | 'long_running' | 'dev_only';
  example_cli: string;
  related_management_path: string | null;
};

export type WorkerCommandListResponse = {
  commands: WorkerCommandRow[];
};

export async function listWorkerCommands(): Promise<WorkerCommandListResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<WorkerCommandListResponse>({
    path: '/workers/commands',
    method: 'GET',
  });
}
