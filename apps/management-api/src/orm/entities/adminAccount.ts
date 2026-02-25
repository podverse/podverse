import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateRandomIdText } from '@podverse/orm';
import type { AdminAccountCredentials } from './adminAccountCredentials.js';
import type { AdminAccountRole } from './adminAccountRole.js';

@Entity('admin_account')
export class AdminAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: 15 })
  id_text!: string;

  @ManyToOne('AdminAccountRole', 'admin_accounts')
  @JoinColumn({ name: 'admin_account_role_id' })
  admin_account_role!: AdminAccountRole;

  @Column()
  admin_account_role_id!: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;

  @OneToOne('AdminAccountCredentials', 'admin_account')
  admin_account_credentials!: AdminAccountCredentials;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
