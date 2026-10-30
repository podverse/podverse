**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 32 — `GET /remote-item/channel/:idOrIdText` for channel remote item lists

A channel's own `podcast:remoteItem` list (rows in `channel_remote_item`) has no read path today;
only the publisher-album subset is read, by the publisher feed. Add a public endpoint that returns
the whole list in the same `RemoteItemsResponse` shape as podroll: parsed channels and items, plus
remote stubs for the rest (plan 31). Areas E and F decide which pages call it.

## Rows

R2, R33, R42

## Runs after

31

## Files

apps/api/src/controllers/remoteItem.ts
apps/api/src/routes/remoteItem.ts
apps/api/src/app.ts
apps/api/openapi.yml
apps/api/src/test/remote-item-channel-list.integration.test.ts
apps/api/src/test/category-channel-item-read.test.ts
packages/helpers-requests/src/api/remoteItem/remoteItem.ts
packages/helpers-requests/src/api/_request.ts
packages/helpers-requests/src/api/feedContentApiPathPrefixes.ts
release-notes/scratchpad.md

## Endpoint

- Method and path: `GET {prefix}{version}/remote-item/channel/:idOrIdText`. Public, no auth, no
  `apiKeyAccess`, no rate-limit wrapper (same as `/podroll/channel/:idOrIdText`).
- Response 200: `RemoteItemsResponse` from `@podverse/helpers`, exactly the shape plan 31 defines.
  Arrays are in feed order (`channel_remote_item.id` ascending).
- Unknown channel: 200 with four empty arrays (same as podroll). No merge check; the page's
  `GET /channel` call handles merged channels first.
- It returns every row of the channel's `channel_remote_item` list, whatever the channel's
  medium. On a publisher channel that includes the album references; the artist page keeps using
  `/publisher-feed`, which applies the verified-album rule this endpoint does not.

## Controller — `apps/api/src/controllers/remoteItem.ts` (new)

Copy the shape of `apps/api/src/controllers/podroll.ts`:

```ts
import { getParamRequired } from '@api/lib/params.js';
import { buildRemoteItemsFinalResult } from '@api/lib/remoteItems.js';
import { idOrIdTextParamSchema, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { ChannelService, RemoteItemReferenceService } from '@podverse/orm';

export class RemoteItemController {
  private static channelService = new ChannelService();
  private static remoteItemReferenceService = new RemoteItemReferenceService();

  static async getRemoteItemsForChannel(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      const idOrIdText = getParamRequired(req, 'idOrIdText');
      const channel = await RemoteItemController.channelService.getByIdOrIdText(idOrIdText, {
        channel_remote_items: true,
      });
      const refs = [...(channel?.channel_remote_items ?? [])].sort(
        (left, right) => left.id - right.id
      );
      const partitioned = await RemoteItemController.remoteItemReferenceService.partition(refs);

      // Channel and Item entities are serialized as the shared channel and item DTOs.
      const finalResult = await buildRemoteItemsFinalResult({
        channelsAdded: partitioned.channelsAdded as unknown as DTOChannel[],
        channelRefsUnmatched: partitioned.channelRefsUnmatched,
        itemsAdded: partitioned.itemsAdded as unknown as DTOItem[],
        itemRefsUnmatched: partitioned.itemRefsUnmatched,
      });

      res.json(finalResult);
    });
  }
}
```

`RemoteItemReferenceService.partition` (plan 30) returns empty arrays for empty input without a
query, so an unknown channel or an empty list costs one channel lookup. `getByIdOrIdText`'s
second argument is a `FindOptionsRelations<Channel>`, the same form `channelPodroll.ts` passes.

## Route — `apps/api/src/routes/remoteItem.ts` (new)

Copy `apps/api/src/routes/podroll.ts`:

```ts
import { config } from '@api/config/index.js';
import { RemoteItemController } from '@api/controllers/remoteItem.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/remote-item`, router);

router.get('/channel/:idOrIdText', asyncHandler(RemoteItemController.getRemoteItemsForChannel));

export const remoteItemRouter = router;
```

Register in `apps/api/src/app.ts`: add
`const { remoteItemRouter } = await import('./routes/remoteItem.js');` after the
`publisherFeedRouter` import (near line 118), and `app.use(remoteItemRouter);` after
`app.use(publisherFeedRouter);` (near line 170).

## Request helper — `packages/helpers-requests`

- New `src/api/remoteItem/remoteItem.ts`, copying `src/api/podroll/podroll.ts`:

  ```ts
  import type { RemoteItemsResponse } from '@podverse/helpers';

  import type { ApiRequestService } from '../_request.js';

  export async function reqRemoteItemGetForChannel(api: ApiRequestService, idOrIdText: string) {
    return api.apiRequest<RemoteItemsResponse>({
      path: `/remote-item/channel/${idOrIdText}`,
      method: 'GET',
    });
  }
  ```

- `src/api/_request.ts`: import it after the `reqPublisherFeedGetRemoteItemsForChannel` import
  (near line 307), and add after the `/* PUBLISHER FEED */` method block (near line 1520):

  ```ts
  /* REMOTE ITEM */

  reqRemoteItemGetForChannel(idOrIdText: string) {
    return reqRemoteItemGetForChannel(this, idOrIdText);
  }
  ```

- `src/api/feedContentApiPathPrefixes.ts`: add `'/remote-item',` after `'/publisher-feed',` so a
  404 on this path counts as an expected client outcome like its siblings.

## OpenAPI — `apps/api/openapi.yml`

- Tags list (near line 49): add `- name: remote-item` after `- name: publisher-feed`.
- Component schemas, after `ApiGetPublisherFeedChannelIdoridtextResponse200` (near line 3847):

  ```yaml
      ApiGetRemoteItemChannelIdoridtextResponse200:
        allOf:
          - $ref: "#/components/schemas/RemoteItemsResultResponse"
  ```

- Path, after the whole `/publisher-feed/channel/{id_or_id_text}` block (near line 20023): a
  `/remote-item/channel/{id_or_id_text}` `get` copied from the podroll path block, with
  `operationId: apiGetRemoteItemChannelIdoridtext`, `tags: [remote-item]`,
  `summary: GET /remote-item/channel/{id_or_id_text}`, `security: []`, the 200 response pointing
  at `ApiGetRemoteItemChannelIdoridtextResponse200`, the same error responses podroll lists, and
  `description: Public endpoint. Returns the channel's own podcast:remoteItem list in feed order: parsed channels and items, and remote stubs for the rest. References with neither are left out. An unknown channel returns empty arrays.`

## Tests

- `apps/api/src/test/remote-item-channel-list.integration.test.ts` (new), structured like the
  podroll stub test in plan 31 (real database, `startTestApp`, mocked `CategoryService`, a
  `../factories/podcastIndexService.js` mock whose functions throw). Seed a list channel (feed,
  channel with `medium_id` `MediumEnum.MusicL`, `channel_about`) and these `channel_remote_item`
  rows in id order:
  1. an item ref to a parsed track (seed an album channel with `channel_about` and one active
     item);
  2. an item ref on a stubbed feed with an item stub;
  3. a channel ref to the stubbed feed;
  4. an unknown GUID with no stub.
  Assert `itemsAdded` = [the parsed track's `id_text`]; `itemsUnadded` = one entry with the seeded
  `item_guid` and `channel_stub.provider_feed_id`; `channelsAdded` = []; `channelsUnadded` = one
  entry with the seeded `provider_feed_id`; the Podcast Index mock was never called. Also assert
  `GET /remote-item/channel/doesNotExist1` returns 200 with four empty arrays. Seed stubs through
  `RemoteChannelStubService.upsertChannelStub` and `RemoteItemStubService.upsertItemStub`; delete
  seeded feeds and stubs in `afterAll`.
- `apps/api/src/test/category-channel-item-read.test.ts`: declare `let remoteItemBase: string;`
  after `let publisherFeedBase: string;` (near line 425), assign
  `remoteItemBase = \`${base}/remote-item\`;` after the `publisherFeedBase` assignment (near line
  443), and add one case at the end of the `podroll and publisher-feed` describe (near line 1121):
  `GET /remote-item/channel/chan-1` returns 200 with `channelsAdded`, `channelsUnadded`,
  `itemsAdded`, and `itemsUnadded` all equal to `[]` (the mocked
  `ChannelService.getByIdOrIdText` returns null, and the real `RemoteItemReferenceService`
  returns empty arrays for empty input without a query).

## Release scratchpad

```markdown
## Channel remote item lists endpoint

- Surfaces: api
- Change: new public `GET /remote-item/channel/:idOrIdText` returns a channel's own
  `podcast:remoteItem` list in feed order, in the same shape as the podroll endpoint: parsed
  channels and items, plus remote stubs for feeds Podverse has not parsed. References with
  neither are left out.
- Who notices: API clients; web and mobile use it to show remote item lists
- Operator steps: none
```
