import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'image_shrink_source' })
export class ImageShrinkSource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url })
  url!: string;

  @Column({
    name: 'etag',
    type: 'varchar',
    length: DATABASE_CONSTANTS.varchar_normal,
    nullable: true,
  })
  etag?: string | null;

  @Column({
    name: 'last_modified',
    type: 'varchar',
    length: DATABASE_CONSTANTS.varchar_normal,
    nullable: true,
  })
  lastModified?: string | null;

  @Column({ name: 'content_length', type: 'int', nullable: true })
  contentLength?: number | null;

  @Column({
    name: 'checksum_sha256',
    type: 'varchar',
    length: DATABASE_CONSTANTS.varchar_sha256_hex,
    nullable: true,
  })
  checksumSha256?: string | null;

  @Column({ name: 'last_checked_at', type: 'timestamp', nullable: true })
  lastCheckedAt?: Date | null;

  @Column({ name: 'last_changed_at', type: 'timestamp', nullable: true })
  lastChangedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
