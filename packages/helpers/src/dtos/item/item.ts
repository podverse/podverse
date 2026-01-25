import { DTOChannel } from '../channel/channel';
import { DTOLiveItem } from '../liveItem/liveItem';
import { DTOItemAbout } from './itemAbout';
import { DTOItemChaptersFeed } from './itemChaptersFeed';
import { DTOItemChat } from './itemChat';
import { DTOItemContentLink } from './itemContentLink';
import { DTOItemDescription } from './itemDescription';
import { DTOItemEnclosure } from './itemEnclosure';
import { DTOItemFunding } from './itemFunding';
import { DTOItemImage } from './itemImage';
import { DTOItemLicense } from './itemLicense';
import { DTOItemLocation } from './itemLocation';
import { DTOItemPerson } from './itemPerson';
import { DTOItemSeason } from './itemSeason';
import { DTOItemSocialInteract } from './itemSocialInteract';
import { DTOItemSoundbite } from './itemSoundbite';
import { DTOItemTranscript } from './itemTranscript';
import { DTOItemTxt } from './itemTxt';
import { DTOItemValue } from './itemValue';

export interface DTOItem {
  id: number;
  id_text: string;
  slug?: string | null;
  channel_id: number;
  guid?: string | null;
  guid_enclosure_url?: string | null;
  pub_date?: string | null;
  title?: string | null;
  item_flag_status_id: number;
  live_item?: DTOLiveItem | null;
  item_about: DTOItemAbout;
  item_chapters_feed?: DTOItemChaptersFeed | null;
  item_chat: DTOItemChat;
  item_description?: DTOItemDescription;
  item_license: DTOItemLicense;
  item_location: DTOItemLocation;
  item_season: DTOItemSeason;
  item_content_links: DTOItemContentLink[];
  item_enclosures: DTOItemEnclosure[];
  item_fundings: DTOItemFunding[];
  item_images: DTOItemImage[];
  item_persons: DTOItemPerson[];
  item_social_interacts: DTOItemSocialInteract[];
  item_soundbites: DTOItemSoundbite[];
  item_transcripts: DTOItemTranscript[];
  item_txts: DTOItemTxt[];
  item_values: DTOItemValue[];
  channel?: DTOChannel;
}

export interface DTOItemQueueItem {
  id: number;
  id_text: string;
  slug?: string | null;
  channel_id: number;
  guid?: string | null;
  guid_enclosure_url?: string | null;
  pub_date?: string | null;
  title?: string | null;
  item_flag_status_id: number;
  item_about: DTOItemAbout;
  item_enclosures: DTOItemEnclosure[];
  item_images: DTOItemImage[];
  channel?: DTOChannel;
}
