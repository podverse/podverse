import { assignIdText, NANO_ID_V2_MAX_LENGTH } from '@orm/lib/nanoid.js';
import { BeforeInsert, Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
@Unique(['name_key', 'distinction_key'])
export class Person {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  name_key!: string;

  /** Empty for the name-only identity. A later split uses a non-empty key and a new public id. */
  @Column({ type: 'varchar', length: 64, default: '' })
  distinction_key!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  display_name!: string;

  /** Short descriptor that tells two people with the same display name apart. Null until one is written. */
  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url, nullable: true })
  list_image_url!: string | null;

  @Column({ type: 'int', default: 0 })
  item_appearance_count!: number;

  @Column({ type: 'int', default: 0 })
  channel_cast_count!: number;

  @Column({ type: 'timestamptz', nullable: true })
  latest_appearance_at!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;

  @BeforeInsert()
  ensureIdText() {
    this.id_text = assignIdText(this.id_text);
  }
}
