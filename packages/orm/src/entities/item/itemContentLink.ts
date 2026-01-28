import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Item } from '@orm/entities/item/item';

@Entity()
export class ItemContentLink {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Item, (item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'varchar', name: 'href', length: DATABASE_CONSTANTS.varchar_url })
  href!: string;

  @Column({
    type: 'varchar',
    name: 'title',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  title?: string | null;
}
