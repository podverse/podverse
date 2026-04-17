import type { ApiRequestService } from '../_request.js';

export type ReqMetaboostMbrssV1MintAppAssertionParams = {
  ingest_url: string;
  body_json: string;
};

export type ReqMetaboostMbrssV1MintAppAssertionResponse = {
  authorization: string;
  ingest_url: string;
};

export async function reqMetaboostMbrssV1MintAppAssertion(
  api: ApiRequestService,
  params: ReqMetaboostMbrssV1MintAppAssertionParams
) {
  return api.apiRequest<ReqMetaboostMbrssV1MintAppAssertionResponse>({
    path: '/metaboost/mbrss-v1/mint-app-assertion',
    method: 'POST',
    data: {
      ingest_url: params.ingest_url,
      body_json: params.body_json,
    },
    config: { withCredentials: true },
  });
}
