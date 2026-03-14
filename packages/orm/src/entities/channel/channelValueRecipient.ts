import type { ChannelValue } from '@orm/entities/channel/channelValue.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_value_recipient' })
export class ChannelValueRecipient {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('ChannelValue', (channelValue: ChannelValue) => channelValue.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_value_id' })
  channel_value!: Relation<ChannelValue>;

  @Column({ type: 'varchar', name: 'type', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', name: 'address', length: DATABASE_CONSTANTS.varchar_long })
  address!: string;

  @Column({ type: 'float', name: 'split' })
  split!: number;

  @Column({
    type: 'varchar',
    name: 'name',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  name!: string | null;

  @Column({
    type: 'varchar',
    name: 'custom_key',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_long,
  })
  custom_key!: string | null;

  @Column({
    type: 'varchar',
    name: 'custom_value',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_long,
  })
  custom_value!: string | null;

  @Column({ type: 'boolean', name: 'fee', default: false })
  fee!: boolean;
}
