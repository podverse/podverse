import type { ChannelAbout } from '@orm/entities/channel/channelAbout.js';
import type { ChannelCategory } from '@orm/entities/channel/channelCategory.js';
import type { ChannelChat } from '@orm/entities/channel/channelChat.js';
import type { ChannelDescription } from '@orm/entities/channel/channelDescription.js';
import type { ChannelFunding } from '@orm/entities/channel/channelFunding.js';
import type { ChannelImage } from '@orm/entities/channel/channelImage.js';
import type { ChannelInternalSettings } from '@orm/entities/channel/channelInternalSettings.js';
import type { ChannelLicense } from '@orm/entities/channel/channelLicense.js';
import type { ChannelLocation } from '@orm/entities/channel/channelLocation.js';
import type { ChannelMetaBoost } from '@orm/entities/channel/channelMetaBoost.js';
import type { ChannelPerson } from '@orm/entities/channel/channelPerson.js';
import type { ChannelPodroll } from '@orm/entities/channel/channelPodroll.js';
import type { ChannelPublisher } from '@orm/entities/channel/channelPublisher.js';
import type { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem.js';
import type { ChannelSeason } from '@orm/entities/channel/channelSeason.js';
import type { ChannelSocialInteract } from '@orm/entities/channel/channelSocialInteract.js';
import type { ChannelTrailer } from '@orm/entities/channel/channelTrailer.js';
import type { ChannelTxt } from '@orm/entities/channel/channelTxt.js';
import type { ChannelValue } from '@orm/entities/channel/channelValue.js';
import type { Feed } from '@orm/entities/feed/feed.js';
import type { Medium } from '@orm/entities/medium.js';
import { generateRandomIdText, NANO_ID_V2_MAX_LENGTH } from '@orm/lib/nanoid.js';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import type { MediumEnum } from '@podverse/helpers';
import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { Item } from '../item/item.js';

@Entity('channel')
@Unique(['podcast_guid'])
@Index('channel_podcast_guid_unique', ['podcast_guid'], { where: 'podcast_guid IS NOT NULL' })
@Index('channel_slug', ['slug'], { where: 'slug IS NOT NULL' })
export class Channel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_slug })
  slug!: string | null;

  @OneToOne('Feed', { cascade: true })
  @JoinColumn({ name: 'feed_id' })
  feed!: Feed;

  @Column({ type: 'int', nullable: false })
  feed_id!: number;

  @Column({ type: 'uuid', nullable: true })
  podcast_guid!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  sortable_title!: string | null;

  @ManyToOne('Medium', (medium: Medium) => medium.id, { nullable: false })
  @JoinColumn({ name: 'medium_id' })
  medium!: MediumEnum;

  @Column({ name: 'medium_id', type: 'int', nullable: false })
  medium_id!: number;

  @Column({ type: 'boolean', default: false })
  has_podcast_index_value!: boolean;

  @Column({ type: 'boolean', default: false })
  has_value_time_splits!: boolean;

  @OneToOne('ChannelAbout', (channel_about: ChannelAbout) => channel_about.channel)
  channel_about!: ChannelAbout;

  @OneToMany('ChannelCategory', (channel_category: ChannelCategory) => channel_category.channel)
  channel_categories!: ChannelCategory[];

  @OneToOne('ChannelChat', (channel_chat: ChannelChat) => channel_chat.channel)
  channel_chat!: ChannelChat;

  @OneToOne(
    'ChannelDescription',
    (channel_description: ChannelDescription) => channel_description.channel
  )
  channel_description!: ChannelDescription;

  @OneToMany('ChannelFunding', (channel_funding: ChannelFunding) => channel_funding.channel)
  channel_fundings!: ChannelFunding[];

  @OneToMany('ChannelImage', (channel_image: ChannelImage) => channel_image.channel)
  channel_images!: ChannelImage[];

  @OneToOne(
    'ChannelInternalSettings',
    (channel_internal_settings: ChannelInternalSettings) => channel_internal_settings.channel
  )
  channel_internal_settings!: ChannelInternalSettings;

  @OneToOne('ChannelLicense', (channel_license: ChannelLicense) => channel_license.channel)
  channel_license!: ChannelLicense;

  @OneToOne('ChannelLocation', (channel_location: ChannelLocation) => channel_location.channel)
  channel_location!: ChannelLocation;

  @OneToOne(
    'ChannelMetaBoost',
    (channel_meta_boost: ChannelMetaBoost) => channel_meta_boost.channel
  )
  channel_meta_boost?: ChannelMetaBoost;

  @OneToMany('ChannelPerson', (channel_person: ChannelPerson) => channel_person.channel)
  channel_persons!: ChannelPerson[];

  @OneToOne('ChannelPodroll', (channel_podroll: ChannelPodroll) => channel_podroll.channel)
  channel_podroll!: ChannelPodroll;

  @OneToOne('ChannelPublisher', (channel_publisher: ChannelPublisher) => channel_publisher.channel)
  channel_publisher!: ChannelPublisher;

  @OneToMany(
    'ChannelRemoteItem',
    (channel_remote_item: ChannelRemoteItem) => channel_remote_item.channel
  )
  channel_remote_items!: ChannelRemoteItem[];

  @OneToMany('ChannelSeason', (channel_season: ChannelSeason) => channel_season.channel)
  channel_seasons!: ChannelSeason[];

  @OneToMany(
    'ChannelSocialInteract',
    (channel_social_interact: ChannelSocialInteract) => channel_social_interact.channel
  )
  channel_social_interacts!: ChannelSocialInteract[];

  @OneToMany('ChannelTrailer', (channel_trailer: ChannelTrailer) => channel_trailer.channel)
  channel_trailers!: ChannelTrailer[];

  @OneToMany('ChannelTxt', (channel_txt: ChannelTxt) => channel_txt.channel)
  channel_txts!: ChannelTxt[];

  @OneToMany('ChannelValue', (channel_value: ChannelValue) => channel_value.channel)
  channel_values!: ChannelValue[];

  @OneToMany('Item', (item: Item) => item.channel)
  items!: Item[];

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }

  @BeforeInsert()
  @BeforeUpdate()
  lowercaseFields() {
    if (this.sortable_title) {
      this.sortable_title = this.sortable_title.toLowerCase();
    }
  }
}
