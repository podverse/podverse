import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Check, OneToOne } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';

@Entity()
@Check('(geo IS NOT NULL AND osm IS NULL) OR (geo IS NULL AND osm IS NOT NULL)')
export class ChannelLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Channel, channel => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  geo!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  osm!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  name!: string | null;
}
