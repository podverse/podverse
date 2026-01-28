import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdminAccount } from './adminAccount';

export enum AdminAccountRoleEnum {
  SUPERUSER = 'superuser',
  ADMIN = 'admin',
}

@Entity('admin_account_role')
export class AdminAccountRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  role!: AdminAccountRoleEnum;

  @OneToMany(() => AdminAccount, (adminAccount) => adminAccount.admin_account_role)
  admin_accounts!: AdminAccount[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at!: Date;
}
