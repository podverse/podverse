import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { AdminAccount } from './adminAccount';

@Entity('admin_account_credentials')
export class AdminAccountCredentials {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => AdminAccount, adminAccount => adminAccount.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_account_id' })
  admin_account!: AdminAccount;

  @Column()
  admin_account_id!: number;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 60 })
  password!: string;
}
