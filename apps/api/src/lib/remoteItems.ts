import type {
  DTOChannel,
  DTOItem,
  RemoteItemGeneric,
  RemoteItemsResponse,
} from '@podverse/helpers';
import {
  RemoteChannelStubService,
  RemoteItemStubService,
  toDTORemoteChannelStub,
  toDTORemoteItemStub,
} from '@podverse/orm';

export async function buildRemoteItemsFinalResult(args: {
  channelsAdded: DTOChannel[];
  channelRefsUnmatched: readonly RemoteItemGeneric[];
  itemsAdded: DTOItem[];
  itemRefsUnmatched: readonly RemoteItemGeneric[];
}): Promise<RemoteItemsResponse> {
  const channelsUnadded: RemoteItemsResponse['channelsUnadded'] = [];
  if (args.channelRefsUnmatched.length > 0) {
    const channelStubs = await new RemoteChannelStubService().getChannelStubsForRefs(
      args.channelRefsUnmatched.map((ref) => ({
        feedGuid: ref.feed_guid,
        feedUrl: ref.feed_url,
      }))
    );
    const emittedChannelStubIds = new Set<number>();
    for (const channelStub of channelStubs) {
      if (!channelStub || emittedChannelStubIds.has(channelStub.id)) {
        continue;
      }
      emittedChannelStubIds.add(channelStub.id);
      channelsUnadded.push(toDTORemoteChannelStub(channelStub));
    }
  }

  const itemRefsWithGuid = args.itemRefsUnmatched.filter(
    (ref) => typeof ref.item_guid === 'string' && ref.item_guid.trim().length > 0
  );
  const itemsUnadded: RemoteItemsResponse['itemsUnadded'] = [];
  if (itemRefsWithGuid.length > 0) {
    const itemStubs = await new RemoteItemStubService().getItemStubsForRefs(
      itemRefsWithGuid.map((ref) => ({
        feedGuid: ref.feed_guid,
        feedUrl: ref.feed_url,
        itemGuid: ref.item_guid ? ref.item_guid.trim() : '',
      }))
    );
    const emittedItemStubIds = new Set<number>();
    for (const itemStub of itemStubs) {
      if (!itemStub || emittedItemStubIds.has(itemStub.id)) {
        continue;
      }
      emittedItemStubIds.add(itemStub.id);
      itemsUnadded.push(toDTORemoteItemStub(itemStub, itemStub.remote_channel_stub));
    }
  }

  return {
    channelsAdded: args.channelsAdded,
    channelsUnadded,
    itemsAdded: args.itemsAdded,
    itemsUnadded,
  };
}
