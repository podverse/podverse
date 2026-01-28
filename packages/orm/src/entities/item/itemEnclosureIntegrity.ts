import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { ItemEnclosure } from '@orm/entities/item/itemEnclosure';

@Entity()
export class ItemEnclosureIntegrity {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ItemEnclosure, (itemEnclosureSource) => itemEnclosureSource.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_enclosure_id' })
  item_enclosure!: ItemEnclosure;

  @Column({ type: 'text' })
  type!: 'sri' | 'pgp-signature';

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long })
  value!: string;
}
