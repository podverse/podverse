import type { Account } from '@orm/entities/account/account.js';
import type { Person } from '@orm/entities/person/person.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class AccountFollowingPerson {
  @PrimaryColumn()
  account_id!: number;

  @PrimaryColumn()
  person_id!: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('Person', (person: Person) => person.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person!: Relation<Person>;
}
