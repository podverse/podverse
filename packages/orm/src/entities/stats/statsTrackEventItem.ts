import type { Item } from '@orm/entities/item/item.js';
import type { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stats_track_event_item')
export class StatsTrackEventItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('uuid')
  account_guid!: string;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'stats_track_account_guid_id' })
  stats_track_account_guid!: Relation<StatsTrackAccountGuid>;

  @Column()
  stats_track_account_guid_id!: number;

  @ManyToOne('Item', (item: Item) => item.id)
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column()
  item_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
