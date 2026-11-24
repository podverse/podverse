import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  PostMbrssV1BoostAfterLargestSplitParams,
  PostMbrssV1BoostTransport,
} from './mbrssV1PostBoost.js';
import { postMbrssV1BoostAfterLargestSplit } from './mbrssV1PostBoost.js';
import { MetaboostCapabilityPreflightError } from './metaboostCapabilityPreflightError.js';

const capabilityBody = {
  schema: 'mbrss-v1',
  message_char_limit: 500,
  terms_of_service_url: 'https://example.com/terms',
};

let fetchMock: ReturnType<typeof vi.fn>;

const createTransport = () => {
  const mintAppAssertion = vi.fn(
    async (): Promise<{ authorization: string; ingestUrl: string }> => ({
      authorization: 'Bearer test',
      ingestUrl: 'https://meta.example/ingest',
    })
  );
  const postIngest = vi.fn(async (): Promise<unknown> => ({ message_guid: 'msg-1' }));
  const transport: PostMbrssV1BoostTransport = { mintAppAssertion, postIngest };
  return { mintAppAssertion, postIngest, transport };
};

const paramsFor = (
  transport: PostMbrssV1BoostTransport,
  overrides: Partial<PostMbrssV1BoostAfterLargestSplitParams> = {}
): PostMbrssV1BoostAfterLargestSplitParams => ({
  largestSplitSucceeded: true,
  metaBoost: { node: 'https://meta.example/v1/s/mbrss-v1/boost/abc/' },
  senderGuid: 'sender-guid-1',
  totalMsat: 3000,
  appName: 'Podverse',
  appVersion: '9.9.9',
  feedGuid: 'feed-guid',
  feedTitle: 'Show Title',
  message: 'hello',
  yourName: 'Ada',
  onMetaboostUnreachable: vi.fn(async () => undefined),
  transport,
  ...overrides,
});

describe('postMbrssV1BoostAfterLargestSplit', () => {
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => capabilityBody,
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not call the transport when the largest split did not succeed', async () => {
    const { mintAppAssertion, postIngest, transport } = createTransport();
    const onMetaboostUnreachable = vi.fn(async () => undefined);

    const result = await postMbrssV1BoostAfterLargestSplit(
      paramsFor(transport, { largestSplitSucceeded: false, onMetaboostUnreachable })
    );

    expect(result).toEqual({ posted: false });
    expect(mintAppAssertion).not.toHaveBeenCalled();
    expect(postIngest).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onMetaboostUnreachable).not.toHaveBeenCalled();
  });

  it('does not call the transport when the sender guid is blank', async () => {
    const { mintAppAssertion, postIngest, transport } = createTransport();
    const onMetaboostUnreachable = vi.fn(async () => undefined);

    const empty = await postMbrssV1BoostAfterLargestSplit(
      paramsFor(transport, { senderGuid: '', onMetaboostUnreachable })
    );
    const whitespace = await postMbrssV1BoostAfterLargestSplit(
      paramsFor(transport, { senderGuid: '   ', onMetaboostUnreachable })
    );

    expect(empty).toEqual({ posted: false });
    expect(whitespace).toEqual({ posted: false });
    expect(mintAppAssertion).not.toHaveBeenCalled();
    expect(postIngest).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onMetaboostUnreachable).not.toHaveBeenCalled();
  });

  it('mints once and posts a boost body when the largest split succeeded', async () => {
    const { mintAppAssertion, postIngest, transport } = createTransport();

    const result = await postMbrssV1BoostAfterLargestSplit(paramsFor(transport));

    expect(result).toEqual({ posted: true, messageGuid: 'msg-1' });
    expect(mintAppAssertion).toHaveBeenCalledTimes(1);
    expect(postIngest).toHaveBeenCalledTimes(1);
    const mintCall = mintAppAssertion.mock.calls[0]?.[0];
    if (mintCall === undefined) {
      throw new Error('expected mint');
    }
    const bodyJson = mintCall.bodyJson;
    expect(postIngest).toHaveBeenCalledWith({
      ingestUrl: 'https://meta.example/ingest',
      authorization: 'Bearer test',
      bodyJson,
    });
    expect(bodyJson).toContain('"action":"boost"');
    expect(bodyJson).toContain('"sender_guid":"sender-guid-1"');
    expect(bodyJson).toMatch(/"amount":3[,}]/);
    expect(bodyJson).toContain('"sender_name":"Ada"');
    expect(bodyJson).not.toContain('"action":"stream"');
  });

  it('reports an unreachable MetaBoost and does not mint when capability fetch fails', async () => {
    fetchMock.mockResolvedValue({
      status: 503,
      ok: false,
      json: async () => ({}),
    });
    const { mintAppAssertion, postIngest, transport } = createTransport();
    const onMetaboostUnreachable = vi.fn(async () => undefined);

    await expect(
      postMbrssV1BoostAfterLargestSplit(paramsFor(transport, { onMetaboostUnreachable }))
    ).rejects.toBeInstanceOf(MetaboostCapabilityPreflightError);

    expect(onMetaboostUnreachable).toHaveBeenCalledTimes(1);
    expect(mintAppAssertion).not.toHaveBeenCalled();
    expect(postIngest).not.toHaveBeenCalled();
  });
});
