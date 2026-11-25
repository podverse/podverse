import { Column, Entity, PrimaryColumn } from 'typeorm';

export type CatalogPodcastIndexAllowlistOrigin = 'deployment' | 'admin';

@Entity('catalog_podcast_index_allowlist')
export class CatalogPodcastIndexAllowlist {
  @PrimaryColumn({ type: 'int' })
  podcast_index_id!: number;

  @Column({ type: 'int', nullable: true })
  resolved_podcast_index_id!: number | null;

  @Column({ type: 'text' })
  origin!: CatalogPodcastIndexAllowlistOrigin;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  feed_url!: string | null;

  @Column({ type: 'int', nullable: true })
  created_by_admin_id!: number | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
