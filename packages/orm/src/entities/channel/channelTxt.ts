import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';

@Entity({ name: 'channel_txt' })
export class ChannelTxt {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Channel, (channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column({
    type: 'varchar',
    name: 'purpose',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  purpose!: string | null;

  @Column({ type: 'varchar', name: 'value', length: DATABASE_CONSTANTS.varchar_long })
  value!: string;
}
