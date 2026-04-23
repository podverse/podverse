import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { Clip } from '@orm/entities/clip.js';
import { Item } from '@orm/entities/item/item.js';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';
import { ItemSoundbite } from '@orm/entities/item/itemSoundbite.js';
import { QueueResource } from '@orm/entities/queue/queueResource.js';
import { Brackets, type SelectQueryBuilder } from 'typeorm';

/**
 * Queue resources point at a concrete item (direct, via clip, or via item_soundbite) or
 * at add-by-RSS-only data. For item-backed rows, only `Active` `item_flag_status` should
 * be listed in queues. Add-by-RSS rows are kept (no linked `item` to evaluate).
 */
export const ACTIVE_ITEM_FLAG_STATUS_ID = ItemFlagStatusStatusEnum.Active;

/**
 * Constrain a `queue_resource` query to rows where the resolved `item` is `Active`, or
 * the row is add-by-RSS-only (`add_by_rss_hash_id` set). Mutates the query builder
 * in place (joins + `andWhere` with `or` branches).
 */
export function applyResolvesToActiveItemOrAddByRss(
  qrAlias: string,
  qb: SelectQueryBuilder<QueueResource>
): void {
  const params = { activeItemFlag: ACTIVE_ITEM_FLAG_STATUS_ID };

  qb.leftJoin(Item, 'qr_f_item', `qr_f_item.id = ${qrAlias}.item_id`)
    .leftJoin(Clip, 'qr_f_clip', `qr_f_clip.id = ${qrAlias}.clip_id`)
    .leftJoin(Item, 'qr_f_clip_item', 'qr_f_clip_item.id = qr_f_clip.item_id')
    .leftJoin(ItemSoundbite, 'qr_f_isb', `qr_f_isb.id = ${qrAlias}.item_soundbite_id`)
    .leftJoin(Item, 'qr_f_isb_item', 'qr_f_isb_item.id = qr_f_isb.item_id')
    .andWhere(
      new Brackets((w) => {
        w.where(`${qrAlias}.add_by_rss_hash_id IS NOT NULL`)
          .orWhere(
            new Brackets((b1) => {
              b1.where(`${qrAlias}.item_id IS NOT NULL`).andWhere(
                'qr_f_item.item_flag_status_id = :activeItemFlag',
                params
              );
            })
          )
          .orWhere(
            new Brackets((b2) => {
              b2.where(`${qrAlias}.clip_id IS NOT NULL`).andWhere(
                'qr_f_clip_item.item_flag_status_id = :activeItemFlag',
                params
              );
            })
          )
          .orWhere(
            new Brackets((b3) => {
              b3.where(`${qrAlias}.item_soundbite_id IS NOT NULL`).andWhere(
                'qr_f_isb_item.item_flag_status_id = :activeItemFlag',
                params
              );
            })
          );
      })
    );
}

/**
 * Remove `queue_resource` rows that resolve to a non-`Active` `item` (direct item, or via
 * `clip` / `item_soundbite`). Add-by-RSS rows are not deleted here. Call after item status
 * changes in `archiveAll` so queues stay aligned with `item_flag_status`.
 */
export async function pruneNonActiveItemBackedQueueResourceRows(): Promise<void> {
  const repo = AppDataSourceReadWrite.getRepository(QueueResource);
  const active = ACTIVE_ITEM_FLAG_STATUS_ID;
  const params: [number] = [active];

  const sql: string[] = [
    `DELETE FROM queue_resource WHERE id IN (
      SELECT qr.id FROM queue_resource qr
      INNER JOIN item i ON qr.item_id = i.id
      WHERE qr.item_id IS NOT NULL AND i.item_flag_status_id <> $1
    )`,
    `DELETE FROM queue_resource WHERE id IN (
      SELECT qr.id FROM queue_resource qr
      INNER JOIN clip c ON qr.clip_id = c.id
      INNER JOIN item i ON c.item_id = i.id
      WHERE qr.clip_id IS NOT NULL AND i.item_flag_status_id <> $1
    )`,
    `DELETE FROM queue_resource WHERE id IN (
      SELECT qr.id FROM queue_resource qr
      INNER JOIN item_soundbite isb ON qr.item_soundbite_id = isb.id
      INNER JOIN item i ON isb.item_id = i.id
      WHERE qr.item_soundbite_id IS NOT NULL AND i.item_flag_status_id <> $1
    )`,
  ];

  for (const s of sql) {
    await repo.query(s, params);
  }
}
