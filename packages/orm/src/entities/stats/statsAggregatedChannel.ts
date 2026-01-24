import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';

@Entity('stats_aggregated_channel')
export class StatsAggregatedChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Channel)
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;

  @Column()
  channel_id!: number;

  @Column('int', { default: 0 })
  day_current_count!: number;

  @Column('int', { default: 0 })
  day_1_count!: number;

  @Column('int', { default: 0 })
  day_2_count!: number;

  @Column('int', { default: 0 })
  day_3_count!: number;

  @Column('int', { default: 0 })
  day_4_count!: number;

  @Column('int', { default: 0 })
  day_5_count!: number;

  @Column('int', { default: 0 })
  day_6_count!: number;

  @Column('int', { default: 0 })
  day_7_count!: number;

  @Column('int', { default: 0 })
  day_8_count!: number;

  @Column('int', { default: 0 })
  week_current_count!: number;

  @Column('int', { default: 0 })
  week_1_count!: number;

  @Column('int', { default: 0 })
  week_2_count!: number;

  @Column('int', { default: 0 })
  week_3_count!: number;

  @Column('int', { default: 0 })
  week_4_count!: number;

  @Column('int', { default: 0 })
  month_current_count!: number;

  @Column('int', { default: 0 })
  month_1_count!: number;

  @Column('int', { default: 0 })
  all_time_count!: number;
}
