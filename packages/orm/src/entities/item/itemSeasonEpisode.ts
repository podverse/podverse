import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';

@Entity('item_season_episode')
export class ItemSeasonEpisode {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  display?: string | null;

  @Column({ type: 'float' })
  number!: number;
}
