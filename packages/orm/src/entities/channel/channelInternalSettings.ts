import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';

@Entity()
export class ChannelInternalSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'text', nullable: true })
  embed_approved_media_url_paths!: string | null;
}
