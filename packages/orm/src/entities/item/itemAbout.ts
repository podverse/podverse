import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import type {
  ItemItunesEpisodeType,
  ItemItunesEpisodeTypeEnum,
} from '@orm/entities/item/itemItunesEpisodeType.js';

@Entity()
export class ItemAbout {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  duration?: string | null;

  @Column({ type: 'boolean', nullable: true })
  explicit?: boolean | null;

  @Column({
    type: 'varchar',
    name: 'website_link_url',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_url,
  })
  website_link_url?: string | null;

  @ManyToOne(
    'ItemItunesEpisodeType',
    (itemItunesEpisodeType: ItemItunesEpisodeType) => itemItunesEpisodeType.id,
    {
      nullable: true,
    }
  )
  @JoinColumn({ name: 'item_itunes_episode_type_id' })
  item_itunes_episode_type?: Relation<ItemItunesEpisodeType> | ItemItunesEpisodeTypeEnum | null;
}
