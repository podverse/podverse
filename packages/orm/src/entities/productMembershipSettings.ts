import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('product_membership_settings')
export class ProductMembershipSettings {
  @PrimaryColumn({ type: 'integer', default: 1 })
  id!: number;

  @Column({ type: 'integer' })
  free_trial_expiration_seconds!: number;

  @Column({ type: 'integer' })
  trial_max_add_by_rss_feeds!: number;

  @Column({ type: 'integer' })
  trial_max_manual_refreshes_per_hour!: number;

  @Column({ type: 'integer' })
  premium_max_add_by_rss_feeds!: number;

  @Column({ type: 'integer' })
  premium_max_manual_refreshes_per_hour!: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
