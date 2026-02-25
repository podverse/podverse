import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';

@Entity()
@Unique(['item'])
export class ItemLicense {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  identifier!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  url!: string | null;
}
