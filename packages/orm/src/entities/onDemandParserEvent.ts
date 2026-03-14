import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { OnDemandParserEventType } from '@podverse/helpers';

@Entity()
export class OnDemandParserEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'podcast_index_id' })
  podcastIndexId!: number;

  @Column({ name: 'remote_parent_podcast_index_id', nullable: true })
  remoteParentPodcastIndexId?: number;

  @Column({
    type: 'enum',
    enum: OnDemandParserEventType,
  })
  type!: OnDemandParserEventType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;
}
