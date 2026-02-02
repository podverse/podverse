import { DATABASE_CONSTANTS } from '@podverse/helpers';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';

@Entity()
export class ChannelPerson {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  name!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  role!: string | null;

  @Column({ type: 'varchar', default: 'cast', length: DATABASE_CONSTANTS.varchar_normal })
  person_group!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  img!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  href!: string | null;

  @BeforeInsert()
  @BeforeUpdate()
  lowercaseFields() {
    if (this.role) {
      this.role = this.role.toLowerCase();
    }
    if (this.person_group) {
      this.person_group = this.person_group.toLowerCase();
    }
  }
}
