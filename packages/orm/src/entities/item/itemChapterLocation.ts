import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, Check, OneToOne } from 'typeorm';
import { ItemChapter } from '@orm/entities/item/itemChapter';

@Entity()
@Check('(geo IS NOT NULL AND osm IS NULL) OR (geo IS NULL AND osm IS NOT NULL)')
export class ItemChapterLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ItemChapter, itemChapter => itemChapter.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_chapter_id' })
  item_chapter!: ItemChapter;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  geo?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  osm?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  name!: string | null;
}
