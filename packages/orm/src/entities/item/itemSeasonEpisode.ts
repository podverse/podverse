import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { Item } from '@orm/entities/item/item';

@Entity('item_season_episode')
export class ItemSeasonEpisode {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Item, (item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  display?: string | null;

  @Column({ type: 'float' })
  number!: number;
}
