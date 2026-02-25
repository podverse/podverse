import { DATABASE_CONSTANTS } from '@podverse/helpers';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import type { ItemEnclosureSource } from '@orm/entities/item/itemEnclosureSource.js';
import type { ItemEnclosureIntegrity } from '@orm/entities/item/itemEnclosureIntegrity.js';

@Entity()
export class ItemEnclosure {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'bigint', nullable: true })
  length?: number | null;

  @Column({ type: 'int', nullable: true })
  bitrate?: number | null;

  @Column({ type: 'int', nullable: true })
  height?: number | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  language?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  title?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  rel?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  codecs?: string | null;

  @Column({ type: 'boolean', default: false })
  item_enclosure_default!: boolean;

  @OneToOne(
    'ItemEnclosureIntegrity',
    (itemEnclosureIntegrity: ItemEnclosureIntegrity) => itemEnclosureIntegrity.item_enclosure
  )
  item_enclosure_integrity!: Relation<ItemEnclosureIntegrity>;

  @OneToMany(
    'ItemEnclosureSource',
    (itemEnclosureSource: ItemEnclosureSource) => itemEnclosureSource.item_enclosure
  )
  item_enclosure_sources!: ItemEnclosureSource[];
}
