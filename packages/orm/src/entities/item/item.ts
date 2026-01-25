import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, BeforeInsert, OneToOne, OneToMany, BeforeUpdate } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { LiveItem } from '../liveItem/liveItem';
import { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed';
import { ItemValue } from '@orm/entities/item/itemValue';
import { ItemAbout } from '@orm/entities/item/itemAbout';
import { ItemChat } from '@orm/entities/item/itemChat';
import { ItemContentLink } from '@orm/entities/item/itemContentLink';
import { ItemDescription } from '@orm/entities/item/itemDescription';
import { ItemEnclosure } from '@orm/entities/item/itemEnclosure';
import { ItemFunding } from '@orm/entities/item/itemFunding';
import { ItemImage } from '@orm/entities/item/itemImage';
import { ItemLicense } from '@orm/entities/item/itemLicense';
import { ItemLocation } from '@orm/entities/item/itemLocation';
import { ItemPerson } from '@orm/entities/item/itemPerson';
import { ItemSeason } from '@orm/entities/item/itemSeason';
import { ItemSeasonEpisode } from '@orm/entities/item/itemSeasonEpisode';
import { ItemSocialInteract } from '@orm/entities/item/itemSocialInteract';
import { ItemSoundbite } from '@orm/entities/item/itemSoundbite';
import { ItemTranscript } from '@orm/entities/item/itemTranscript';
import { ItemTxt } from '@orm/entities/item/itemTxt';
import { ItemFlagStatus } from './itemFlagStatus';
import { generateRandomIdText } from '@orm/lib/nanoid';

@Entity()
@Index('item_slug', ['slug'], { unique: true, where: 'slug IS NOT NULL' })
export class Item {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;
  
  @Column({ type: 'varchar', name: 'slug', nullable: true, length: DATABASE_CONSTANTS.varchar_slug })
  slug?: string | null;

  @Column()
  channel_id!: string;

  @ManyToOne(() => Channel, channel => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Channel;
  
  @Column({ type: 'varchar', name: 'guid', nullable: true, length: DATABASE_CONSTANTS.varchar_uri })
  guid?: string | null;

  @Column({ type: 'varchar', name: 'guid_enclosure_url', length: DATABASE_CONSTANTS.varchar_url })
  guid_enclosure_url?: string | null;

  @Column({ type: 'timestamptz', name: 'pub_date', nullable: true })
  pub_date?: Date | null;

  @Column({ type: 'varchar', name: 'title', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @OneToOne(() => LiveItem, liveItem => liveItem.item, { nullable: true })
  live_item!: LiveItem | null;

  @ManyToOne(() => ItemFlagStatus, item_flag_status => item_flag_status.id)
  @JoinColumn({ name: 'item_flag_status_id' })
  item_flag_status!: ItemFlagStatus;

  @OneToOne(() => ItemAbout, item_about => item_about.item)
  item_about!: ItemAbout;

  @OneToOne(() => ItemChaptersFeed, item_chapters_feed => item_chapters_feed.item)
  item_chapters_feed!: ItemChaptersFeed;

  @OneToOne(() => ItemChat, item_chat => item_chat.item)
  item_chat!: ItemChat;

  @OneToMany(() => ItemContentLink, item_content_link => item_content_link.item)
  item_content_links!: ItemContentLink[];

  @OneToOne(() => ItemDescription, item_description => item_description.item)
  item_description!: ItemDescription;

  @OneToMany(() => ItemEnclosure, item_enclosure => item_enclosure.item)
  item_enclosures!: ItemEnclosure[];

  @OneToMany(() => ItemFunding, item_funding => item_funding.item)
  item_fundings!: ItemFunding[];

  @OneToMany(() => ItemImage, item_image => item_image.item)
  item_images!: ItemImage[];

  @OneToOne(() => ItemLicense, item_license => item_license.item)
  item_license!: ItemLicense;

  @OneToOne(() => ItemLocation, item_location => item_location.item)
  item_location!: ItemLocation;

  @OneToMany(() => ItemPerson, item_person => item_person.item)
  item_persons!: ItemPerson[];
  
  @OneToOne(() => ItemSeason, item_season => item_season.item)
  item_season!: ItemSeason;

  @OneToOne(() => ItemSeasonEpisode, item_season_episode => item_season_episode.item)
  item_season_episode!: ItemSeasonEpisode;

  @OneToMany(() => ItemSocialInteract, item_social_interact => item_social_interact.item)
  item_social_interacts!: ItemSocialInteract[];

  @OneToMany(() => ItemSoundbite, item_soundbite => item_soundbite.item)
  item_soundbites!: ItemSoundbite[];

  @OneToMany(() => ItemTranscript, item_transcript => item_transcript.item)
  item_transcripts!: ItemTranscript[];

  @OneToMany(() => ItemTxt, item_txt => item_txt.item)
  item_txts!: ItemTxt[];

  @OneToMany(() => ItemValue, itemValue => itemValue.item)
  item_values!: ItemValue[];
  
  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }

  @BeforeInsert()
  @BeforeUpdate()
  checkGuidOrEnclosureUrl() {
    if (!this.guid && !this.guid_enclosure_url) {
      throw new Error('Either guid or guid_enclosure_url must be present');
    }
  }
}
