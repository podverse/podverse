import { Entity, PrimaryGeneratedColumn, Column, Unique, Check } from 'typeorm';

export { ItemItunesEpisodeTypeEnum, getItemItunesEpisodeTypeEnumValue } from '@podverse/helpers';

@Entity()
@Unique(['itunes_episode_type'])
@Check("\"itunes_episode_type\" IN ('full', 'trailer', 'bonus')")
export class ItemItunesEpisodeType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', name: 'itunes_episode_type' })
  itunes_episode_type!: string;
}
