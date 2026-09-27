import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('management_admin_role')
export class ManagementAdminRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @Column({ name: 'feeds_crud', type: 'integer' })
  feedsCrud!: number;

  @Column({ name: 'feed_takedown_reasons_crud', type: 'integer' })
  feedTakedownReasonsCrud!: number;

  @Column({ name: 'admins_crud', type: 'integer' })
  adminsCrud!: number;

  @Column({ name: 'stats_crud', type: 'integer' })
  statsCrud!: number;

  @Column({ name: 'billing_prices_crud', type: 'integer' })
  billingPricesCrud!: number;

  @Column({ name: 'bucket_crud', type: 'integer' })
  bucketCrud!: number;

  @Column({ name: 'embed_demo_crud', type: 'integer' })
  embedDemoCrud!: number;

  @Column({ name: 'notifications_crud', type: 'integer' })
  notificationsCrud!: number;

  @Column({ name: 'billing_channels_crud', type: 'integer' })
  billingChannelsCrud!: number;

  @Column({ name: 'billing_processor_products_crud', type: 'integer' })
  billingProcessorProductsCrud!: number;

  @Column({ name: 'billing_account_crud', type: 'integer' })
  billingAccountCrud!: number;

  @Column({ name: 'billing_webhook_events_crud', type: 'integer' })
  billingWebhookEventsCrud!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;
}
