import { DATABASE_CONSTANTS, MediumEnum } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, Index, OneToOne, JoinColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import { ChannelAbout } from '@orm/entities/channel/channelAbout';
import { ChannelCategory } from '@orm/entities/channel/channelCategory';
import { ChannelChat } from '@orm/entities/channel/channelChat';
import { ChannelDescription } from '@orm/entities/channel/channelDescription';
import { ChannelFunding } from '@orm/entities/channel/channelFunding';
import { ChannelImage } from '@orm/entities/channel/channelImage';
import { ChannelInternalSettings } from '@orm/entities/channel/channelInternalSettings';
import { ChannelLicense } from '@orm/entities/channel/channelLicense';
import { ChannelLocation } from '@orm/entities/channel/channelLocation';
import { ChannelPerson } from '@orm/entities/channel/channelPerson';
import { ChannelPodroll } from '@orm/entities/channel/channelPodroll';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher';
import { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem';
import { ChannelSeason } from '@orm/entities/channel/channelSeason';
import { ChannelSocialInteract } from '@orm/entities/channel/channelSocialInteract';
import { ChannelTrailer } from '@orm/entities/channel/channelTrailer';
import { ChannelTxt } from '@orm/entities/channel/channelTxt';
import { ChannelValue } from '@orm/entities/channel/channelValue';
import { Feed } from '@orm/entities/feed/feed'; 
import { Medium } from '@orm/entities/medium';
import { Item } from '../item/item';
import { generateRandomIdText } from '@orm/lib/nanoid';

@Entity('channel')
@Unique(['podcast_guid'])
@Index('channel_podcast_guid_unique', ['podcast_guid'], { where: 'podcast_guid IS NOT NULL' })
@Index('channel_slug', ['slug'], { where: 'slug IS NOT NULL' })
export class Channel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_slug })
  slug!: string | null;

  @OneToOne(() => Feed, { cascade: true })
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

  @ManyToOne(() => Medium, medium => medium.id, { nullable: false })
  @JoinColumn({ name: 'medium_id' })
  medium!: MediumEnum;

  @Column({ name: 'medium_id', type: 'int', nullable: false })
  medium_id!: number;

  @Column({ type: 'boolean', default: false })
  has_podcast_index_value!: boolean;

  @Column({ type: 'boolean', default: false })
  has_value_time_splits!: boolean;
  
  @OneToOne(() => ChannelAbout, channel_about => channel_about.channel)
  channel_about!: ChannelAbout;

  @OneToMany(() => ChannelCategory, channel_category => channel_category.channel)
  channel_categories!: ChannelCategory[];

  @OneToOne(() => ChannelChat, channel_chat => channel_chat.channel)
  channel_chat!: ChannelChat;  

  @OneToOne(() => ChannelDescription, channel_description => channel_description.channel)
  channel_description!: ChannelDescription;  

  @OneToMany(() => ChannelFunding, channel_funding => channel_funding.channel)
  channel_fundings!: ChannelFunding[];

  @OneToMany(() => ChannelImage, channel_image => channel_image.channel)
  channel_images!: ChannelImage[];

  @OneToOne(() => ChannelInternalSettings, channel_internal_settings => channel_internal_settings.channel)
  channel_internal_settings!: ChannelInternalSettings;

  @OneToOne(() => ChannelLicense, channel_license => channel_license.channel)
  channel_license!: ChannelLicense;

  @OneToOne(() => ChannelLocation, channel_location => channel_location.channel)
  channel_location!: ChannelLocation;

  @OneToMany(() => ChannelPerson, channel_person => channel_person.channel)
  channel_persons!: ChannelPerson[];

  @OneToOne(() => ChannelPodroll, channel_podroll => channel_podroll.channel)
  channel_podroll!: ChannelPodroll;

  @OneToOne(() => ChannelPublisher, channel_publisher => channel_publisher.channel)
  channel_publisher!: ChannelPublisher;

  @OneToMany((() => ChannelRemoteItem), channel_remote_item => channel_remote_item.channel)
  channel_remote_items!: ChannelRemoteItem[];

  @OneToMany(() => ChannelSeason, channel_season => channel_season.channel)
  channel_seasons!: ChannelSeason[];

  @OneToMany(() => ChannelSocialInteract, channel_social_interact => channel_social_interact.channel)
  channel_social_interacts!: ChannelSocialInteract[];

  @OneToMany(() => ChannelTrailer, channel_trailer => channel_trailer.channel)
  channel_trailers!: ChannelTrailer[];

  @OneToMany(() => ChannelTxt, channel_txt => channel_txt.channel)
  channel_txts!: ChannelTxt[];

  @OneToMany(() => ChannelValue, channel_value => channel_value.channel)
  channel_values!: ChannelValue[];

  @OneToMany(() => Item, item => item.channel)
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
