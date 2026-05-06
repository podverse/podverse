import type { Feed } from '@orm/entities/feed/feed.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feed_policy_override')
export class FeedPolicyOverride {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Feed', (feed: Feed) => feed.feed_policy_override, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Relation<Feed>;

  @Column({ type: 'int', unique: true })
  feed_id!: number;

  @Column({ type: 'boolean', nullable: true })
  parse_allowed_override!: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  public_visible_override!: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  add_allowed_override!: boolean | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'int', nullable: true })
  updated_by_admin_id!: number | null;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}
