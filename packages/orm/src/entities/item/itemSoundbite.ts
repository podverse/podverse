import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { Item } from '@orm/entities/item/item';
import { generateRandomIdText } from '@orm/lib/nanoid';

@Entity()
export class ItemSoundbite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @ManyToOne(() => Item, item => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  duration!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}