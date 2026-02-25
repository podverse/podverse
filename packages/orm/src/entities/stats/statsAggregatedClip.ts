import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Clip } from '@orm/entities/clip.js';

@Entity('stats_aggregated_clip')
export class StatsAggregatedClip {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Clip', (clip: Clip) => clip.id)
  @JoinColumn({ name: 'clip_id' })
  clip!: Relation<Clip>;

  @Column()
  clip_id!: number;

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
