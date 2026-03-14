import type { Category } from '@orm/entities/category.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('channel_category')
export class ChannelCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'category_id' })
  category_id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @ManyToOne('Category', (category: Category) => category.id)
  @JoinColumn({ name: 'category_id' })
  category!: Relation<Category>;
}
