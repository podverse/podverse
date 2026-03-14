import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export { LiveItemStatusEnum, getLiveItemStatusEnumValue } from '@podverse/helpers';

@Entity()
export class LiveItemStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  status!: 'pending' | 'live' | 'ended';
}
