import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ItemEnclosure } from '@orm/entities/item/itemEnclosure';

@Entity()
export class ItemEnclosureSource {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ItemEnclosure, itemEnclosure => itemEnclosure.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_enclosure_id' })
  item_enclosure!: ItemEnclosure;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri })
  uri!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  content_type?: string | null;
}
