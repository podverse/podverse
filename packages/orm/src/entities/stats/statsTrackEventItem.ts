import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid';
import { Item } from '@orm/entities/item/item';

@Entity('stats_track_event_item')
export class StatsTrackEventItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => StatsTrackAccountGuid)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: StatsTrackAccountGuid;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column()
  item_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}