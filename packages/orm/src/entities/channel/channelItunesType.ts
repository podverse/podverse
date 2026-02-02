import { ChannelItunesTypeItunesTypeEnum } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, Unique, Check } from 'typeorm';

export {
  ChannelItunesTypeItunesTypeEnum,
  getChannelItunesTypeItunesTypeEnumValue,
} from '@podverse/helpers';

@Entity()
@Unique(['itunes_type'])
@Check("itunes_type IN ('episodic', 'serial')")
export class ChannelItunesType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ChannelItunesTypeItunesTypeEnum,
  })
  itunes_type!: ChannelItunesTypeItunesTypeEnum;
}
