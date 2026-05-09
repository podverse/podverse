import type { DTOItemChapter } from '@podverse/helpers';
import type { ItemChapter } from '@podverse/orm';

/**
 * Maps an ItemChapter entity to DTOItemChapter for JSON responses. Uses the nested
 * item_chapters_object chain (ORM shape) and exposes item_chapters_feed at the root as
 * clients expect. Nested `item` includes only fields needed to avoid Item ↔ feed cycles
 * and oversized payloads; callers load full item via item endpoints when needed.
 *
 * The nested `item` is not a full DTOItem; chapter SSR and clients resolve the episode
 * via id_text only.
 */
export function itemChapterEntityToDto(chapter: ItemChapter): DTOItemChapter {
  const feed = chapter.item_chapters_object?.item_chapters_feed ?? null;
  const itemEntity = feed?.item ?? null;

  const nestedItem =
    itemEntity !== null && itemEntity !== undefined
      ? {
          id: itemEntity.id,
          id_text: itemEntity.id_text,
          channel_id: Number(itemEntity.channel_id),
        }
      : null;

  const feedDto =
    feed !== null && feed !== undefined
      ? {
          id: feed.id,
          item_id: itemEntity?.id ?? 0,
          url: feed.url,
          type: feed.type,
          item: nestedItem,
        }
      : null;

  return {
    id: chapter.id,
    id_text: chapter.id_text,
    item_chapters_feed_id: feed?.id ?? 0,
    data_hash: chapter.data_hash,
    start_time: chapter.start_time,
    end_time: chapter.end_time ?? null,
    title: chapter.title ?? null,
    img: chapter.img ?? null,
    web_url: chapter.web_url ?? null,
    table_of_contents: chapter.table_of_contents,
    item_chapters_feed: feedDto,
  } as DTOItemChapter;
}
