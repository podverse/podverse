import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';

@Entity()
@Unique(['channel'])
export class ChannelLicense {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  identifier!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  url!: string | null;
}
