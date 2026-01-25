import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Item } from '@orm/entities/item/item';

@Entity()
export class ItemSocialInteract {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Item, item => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  protocol!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri })
  uri!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  account_id?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  account_url?: string | null;

  @Column({ type: 'int', nullable: true })
  priority?: number | null;
}