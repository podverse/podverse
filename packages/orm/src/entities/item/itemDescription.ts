import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, OneToOne } from 'typeorm';
import { Item } from '@orm/entities/item/item';

@Entity()
@Unique(['item'])
export class ItemDescription {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Item, (item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_longer })
  value!: string;
}
