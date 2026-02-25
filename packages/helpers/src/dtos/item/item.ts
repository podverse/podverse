import type { DTOChannel } from '../channel/channel.js';
import type { DTOLiveItem } from '../liveItem/liveItem.js';
import type { DTOItemAbout } from './itemAbout.js';
import type { DTOItemChaptersFeed } from './itemChaptersFeed.js';
import type { DTOItemChat } from './itemChat.js';
import type { DTOItemContentLink } from './itemContentLink.js';
import type { DTOItemDescription } from './itemDescription.js';
import type { DTOItemEnclosure } from './itemEnclosure.js';
import type { DTOItemFunding } from './itemFunding.js';
import type { DTOItemImage } from './itemImage.js';
import type { DTOItemLicense } from './itemLicense.js';
import type { DTOItemLocation } from './itemLocation.js';
import type { DTOItemPerson } from './itemPerson.js';
import type { DTOItemSeason } from './itemSeason.js';
import type { DTOItemSocialInteract } from './itemSocialInteract.js';
import type { DTOItemSoundbite } from './itemSoundbite.js';
import type { DTOItemTranscript } from './itemTranscript.js';
import type { DTOItemTxt } from './itemTxt.js';
import type { DTOItemValue } from './itemValue.js';

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
