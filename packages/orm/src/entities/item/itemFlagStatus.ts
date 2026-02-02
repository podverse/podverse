import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { Item } from './item.js';

export enum ItemFlagStatusStatusEnum {
  Active = 1,
  PendingArchive = 2,
  Archived = 3,
  PendingDelete = 4,
}

@Entity('item_flag_status')
export class ItemFlagStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ItemFlagStatusStatusEnum,
    default: ItemFlagStatusStatusEnum.Active,
  })
  status!: ItemFlagStatusStatusEnum;

  @OneToMany('Item', (item: Item) => item.item_flag_status)
  items!: Item[];
}
