import { ApiRequestService } from '../_request';

export async function reqItemTranscriptGet(api: ApiRequestService, item_soundbite_id_text: string) {
  return api.apiRequest<{ data: string | null }>({
    path: `/item-transcript/${item_soundbite_id_text}`,
    method: 'GET',
  });
}
