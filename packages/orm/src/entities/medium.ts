import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { MediumEnum } from '@podverse/helpers';

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
