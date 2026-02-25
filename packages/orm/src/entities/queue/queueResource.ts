import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Queue } from '@orm/entities/queue/queue.js';
import type { Clip } from '../clip.js';
import type { Item } from '../item/item.js';
import type { ItemSoundbite } from '../item/itemSoundbite.js';

@Entity()
export class QueueResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Queue', (queue: Queue) => queue.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'queue_id' })
  queue!: Relation<Queue>;

  @Column({ type: 'numeric' })
  list_position!: string;

  @Column({ type: 'numeric', default: 0 })
  playback_position!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  media_file_duration!: string;

  @Column({ type: 'boolean', default: false })
  completed!: boolean;

  @Column()
  clip_id!: string;

  @ManyToOne('Clip', (clip: Clip) => clip.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clip_id' })
  clip!: Relation<Clip>;

  @Column()
  item_id!: string;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column()
  item_soundbite_id!: string;

  @ManyToOne('ItemSoundbite', (itemSoundbite: ItemSoundbite) => itemSoundbite.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_soundbite_id' })
  item_soundbite!: Relation<ItemSoundbite>;

  @Column()
  add_by_rss_hash_id!: string;

  @Column({ type: 'jsonb' })
  add_by_rss_resource_data!: object;
}
