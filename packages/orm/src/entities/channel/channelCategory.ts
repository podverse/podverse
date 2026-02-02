import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { Category } from '@orm/entities/category.js';

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
