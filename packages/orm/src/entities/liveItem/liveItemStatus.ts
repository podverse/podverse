import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export { LiveItemStatusEnum, getLiveItemStatusEnumValue } from '@podverse/helpers';

@Entity()
export class LiveItemStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  status!: 'pending' | 'live' | 'ended';
}
