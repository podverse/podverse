import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from '@orm/entities/account/account';

@Entity('stats_track_account_guid')
export class StatsTrackAccountGuid {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column('uuid')
  account_guid!: string;

  @CreateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}