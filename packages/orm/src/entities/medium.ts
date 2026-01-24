import { MediumEnum } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'medium' })
export class Medium {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: MediumEnum,
  })
  value!: MediumEnum;
}
