import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('embed_demo_showcase')
export class EmbedDemoShowcase {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  showcase_id!: string;

  @Column({ type: 'varchar', length: 15 })
  resource_id_text!: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  play_resource_id_text!: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
