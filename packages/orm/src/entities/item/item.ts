import type { Channel } from '@orm/entities/channel/channel.js';
import type { ItemAbout } from '@orm/entities/item/itemAbout.js';
import type { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import type { ItemChat } from '@orm/entities/item/itemChat.js';
import type { ItemContentLink } from '@orm/entities/item/itemContentLink.js';
import type { ItemDescription } from '@orm/entities/item/itemDescription.js';
import type { ItemEnclosure } from '@orm/entities/item/itemEnclosure.js';
import type { ItemFunding } from '@orm/entities/item/itemFunding.js';
import type { ItemImage } from '@orm/entities/item/itemImage.js';
import type { ItemLicense } from '@orm/entities/item/itemLicense.js';
import type { ItemLocation } from '@orm/entities/item/itemLocation.js';
import type { ItemPerson } from '@orm/entities/item/itemPerson.js';
import type { ItemSeason } from '@orm/entities/item/itemSeason.js';
import type { ItemSeasonEpisode } from '@orm/entities/item/itemSeasonEpisode.js';
import type { ItemSocialInteract } from '@orm/entities/item/itemSocialInteract.js';
import type { ItemSoundbite } from '@orm/entities/item/itemSoundbite.js';
import type { ItemTranscript } from '@orm/entities/item/itemTranscript.js';
import type { ItemTxt } from '@orm/entities/item/itemTxt.js';
import type { ItemValue } from '@orm/entities/item/itemValue.js';
import { generateRandomIdText } from '@orm/lib/nanoid.js';
import type { Relation } from 'typeorm';
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
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { LiveItem } from '../liveItem/liveItem.js';
import type { ItemFlagStatus } from './itemFlagStatus.js';

@Entity()
@Index('item_slug', ['slug'], { unique: true, where: 'slug IS NOT NULL' })
export class Item {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @Column({
    type: 'varchar',
    name: 'slug',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_slug,
  })
  slug?: string | null;

  @Column()
  channel_id!: string;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', name: 'guid', nullable: true, length: DATABASE_CONSTANTS.varchar_uri })
  guid?: string | null;

  @Column({ type: 'varchar', name: 'guid_enclosure_url', length: DATABASE_CONSTANTS.varchar_url })
  guid_enclosure_url?: string | null;

  @Column({ type: 'timestamptz', name: 'pub_date', nullable: true })
  pub_date?: Date | null;

  @Column({
    type: 'varchar',
    name: 'title',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  title?: string | null;

  @OneToOne('LiveItem', (liveItem: LiveItem) => liveItem.item, { nullable: true })
  live_item!: Relation<LiveItem> | null;

  @ManyToOne('ItemFlagStatus', (item_flag_status: ItemFlagStatus) => item_flag_status.id)
  @JoinColumn({ name: 'item_flag_status_id' })
  item_flag_status!: Relation<ItemFlagStatus>;

  @OneToOne('ItemAbout', (item_about: ItemAbout) => item_about.item)
  item_about!: Relation<ItemAbout>;

  @OneToOne('ItemChaptersFeed', (item_chapters_feed: ItemChaptersFeed) => item_chapters_feed.item)
  item_chapters_feed!: Relation<ItemChaptersFeed>;

  @OneToOne('ItemChat', (item_chat: ItemChat) => item_chat.item)
  item_chat!: Relation<ItemChat>;

  @OneToMany('ItemContentLink', (item_content_link: ItemContentLink) => item_content_link.item)
  item_content_links!: ItemContentLink[];

  @OneToOne('ItemDescription', (item_description: ItemDescription) => item_description.item)
  item_description!: Relation<ItemDescription>;

  @OneToMany('ItemEnclosure', (item_enclosure: ItemEnclosure) => item_enclosure.item)
  item_enclosures!: ItemEnclosure[];

  @OneToMany('ItemFunding', (item_funding: ItemFunding) => item_funding.item)
  item_fundings!: ItemFunding[];

  @OneToMany('ItemImage', (item_image: ItemImage) => item_image.item)
  item_images!: ItemImage[];

  @OneToOne('ItemLicense', (item_license: ItemLicense) => item_license.item)
  item_license!: Relation<ItemLicense>;

  @OneToOne('ItemLocation', (item_location: ItemLocation) => item_location.item)
  item_location!: Relation<ItemLocation>;

  @OneToMany('ItemPerson', (item_person: ItemPerson) => item_person.item)
  item_persons!: ItemPerson[];

  @OneToOne('ItemSeason', (item_season: ItemSeason) => item_season.item)
  item_season!: Relation<ItemSeason>;

  @OneToOne(
    'ItemSeasonEpisode',
    (item_season_episode: ItemSeasonEpisode) => item_season_episode.item
  )
  item_season_episode!: Relation<ItemSeasonEpisode>;

  @OneToMany(
    'ItemSocialInteract',
    (item_social_interact: ItemSocialInteract) => item_social_interact.item
  )
  item_social_interacts!: ItemSocialInteract[];

  @OneToMany('ItemSoundbite', (item_soundbite: ItemSoundbite) => item_soundbite.item)
  item_soundbites!: ItemSoundbite[];

  @OneToMany('ItemTranscript', (item_transcript: ItemTranscript) => item_transcript.item)
  item_transcripts!: ItemTranscript[];

  @OneToMany('ItemTxt', (item_txt: ItemTxt) => item_txt.item)
  item_txts!: ItemTxt[];

  @OneToMany('ItemValue', (itemValue: ItemValue) => itemValue.item)
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
