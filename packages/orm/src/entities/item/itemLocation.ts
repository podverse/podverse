import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Check, OneToOne } from 'typeorm';
import { Item } from '@orm/entities/item/item';

@Entity()
@Check('(geo IS NOT NULL AND osm IS NULL) OR (geo IS NULL AND osm IS NOT NULL)')
export class ItemLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Item, item => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  geo?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  osm?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  name!: string | null;
}