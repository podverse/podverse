import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';

@Entity('stats_aggregated_item')
export class StatsAggregatedItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Item', (item: Item) => item.id)
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column()
  item_id!: number;

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
