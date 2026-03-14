import type { ChannelSeason } from '@orm/entities/channel/channelSeason.js';
import type { Item } from '@orm/entities/item/item.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class ItemSeason {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', name: 'channel_season_id' })
  channel_season_id!: number;

  @ManyToOne('ChannelSeason', (channel_season: ChannelSeason) => channel_season.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_season_id' })
  channel_season!: Relation<ChannelSeason>;

  @OneToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title!: string | null;
}
