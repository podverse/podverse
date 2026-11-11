import { NANO_ID_V2_MAX_LENGTH } from '@orm/lib/nanoid.js';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/** A v4 id and the v5 id it resolved to. Stores ids only. */
@Entity('legacy_id_map')
@Unique('legacy_id_map_legacy_unique', ['legacy_kind', 'legacy_id'])
@Index('legacy_id_map_v5_idx', ['v5_kind', 'v5_id_text'])
export class LegacyIdMap {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id!: string;

  @Column({ type: 'text' })
  legacy_kind!: string;

  @Column({ type: 'text' })
  legacy_id!: string;

  @Column({ type: 'text' })
  v5_kind!: string;

  @Column({ type: 'varchar', length: NANO_ID_V2_MAX_LENGTH, nullable: true })
  v5_id_text!: string | null;

  @Column({ type: 'text', nullable: true })
  resolve_key!: string | null;

  @Column({ type: 'text' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
