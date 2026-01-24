import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';

@Entity()
@Index('idx_category_parent_id', ['parent_id'])
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Category, category => category.id, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent_id!: number | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  display_name!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  slug!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal, nullable: true })
  mapping_key!: string | null;
}
