import type { Relation } from 'typeorm';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { Item } from './item.js';

@Entity()
export class ItemPerson {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal })
  name!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  role!: string | null;

  @Column({ type: 'varchar', default: 'cast', length: DATABASE_CONSTANTS.varchar_normal })
  person_group!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  img!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  href!: string | null;

  @BeforeInsert()
  @BeforeUpdate()
  lowercaseFields() {
    if (this.role) {
      this.role = this.role.toLowerCase();
    }
    if (this.person_group) {
      this.person_group = this.person_group.toLowerCase();
    }
  }
}
