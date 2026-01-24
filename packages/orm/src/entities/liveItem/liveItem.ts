import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Item } from '@orm/entities/item/item';
import { LiveItemStatus } from '@orm/entities/liveItem/liveItemStatus';

@Entity()
export class LiveItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Item, item => item.live_item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @ManyToOne(() => LiveItemStatus, liveItemStatus => liveItemStatus.id)
  @JoinColumn({ name: 'live_item_status_id' })
  live_item_status!: LiveItemStatus;

  @Column({ name: 'live_item_status_id', type: 'int', nullable: false })
  live_item_status_id!: number;

  @Column({ type: 'timestamptz' })
  start_time!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  end_time?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  chat_web_url?: string | null;
}