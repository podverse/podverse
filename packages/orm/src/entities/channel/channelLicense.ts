import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Unique, OneToOne } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';

@Entity()
@Unique(['channel'])
export class ChannelLicense {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Channel, (channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  identifier!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  url!: string | null;
}
