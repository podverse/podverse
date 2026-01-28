import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Queue } from '@orm/entities/queue/queue';
import { Clip } from '../clip';
import { Item } from '../item/item';
import { ItemSoundbite } from '../item/itemSoundbite';

@Entity()
export class QueueResource {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Queue, (queue) => queue.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'queue_id' })
  queue!: Queue;

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

  @ManyToOne(() => Clip, (clip) => clip.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clip_id' })
  clip!: Clip;

  @Column()
  item_id!: string;

  @ManyToOne(() => Item, (item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column()
  item_soundbite_id!: string;

  @ManyToOne(() => ItemSoundbite, (itemSoundbite) => itemSoundbite.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_soundbite_id' })
  item_soundbite!: ItemSoundbite;

  @Column()
  add_by_rss_hash_id!: string;

  @Column({ type: 'jsonb' })
  add_by_rss_resource_data!: object;
}
