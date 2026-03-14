import type { Item } from '@orm/entities/item/item.js';
import type { LiveItemStatus } from '@orm/entities/liveItem/liveItemStatus.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LiveItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Item', (item: Item) => item.live_item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @ManyToOne('LiveItemStatus', (liveItemStatus: LiveItemStatus) => liveItemStatus.id)
  @JoinColumn({ name: 'live_item_status_id' })
  live_item_status!: Relation<LiveItemStatus>;

  @Column({ name: 'live_item_status_id', type: 'int', nullable: false })
  live_item_status_id!: number;

  @Column({ type: 'timestamptz' })
  start_time!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_time?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  chat_web_url?: string | null;
}
