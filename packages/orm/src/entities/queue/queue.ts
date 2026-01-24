import { MediumEnum } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, BeforeInsert, Column } from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { Medium } from '@orm/entities/medium';
import { generateRandomIdText } from '@orm/lib/nanoid';

@Entity()
export class Queue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @ManyToOne(() => Account, account => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => Medium, medium => medium.id)
  @JoinColumn({ name: 'medium_id' })
  medium!: MediumEnum;

  /*
    NOTE: this is not truly nullable, but we need this column to allow
    nested where queries using the .find method of TypeORM.
  */
  @Column({ name: 'medium_id', type: 'int', nullable: true })
  medium_id?: number | null;

  @Column({ type: 'boolean', default: false })
  is_active_queue!: boolean;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
