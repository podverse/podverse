import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';

@Entity()
export class ChannelImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url })
  url!: string;

  @Column({ type: 'int', nullable: true })
  image_width_size!: number | null;

  @Column({ type: 'boolean', default: false })
  is_resized!: boolean;
}
