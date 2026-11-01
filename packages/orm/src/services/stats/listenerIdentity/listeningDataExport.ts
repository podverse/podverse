import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { StatsChannelHidden } from '@orm/entities/stats/statsChannelHidden.js';
import { StatsListenEvent } from '@orm/entities/stats/statsListenEvent.js';
import { StatsOpenEvent } from '@orm/entities/stats/statsOpenEvent.js';
import { StatsTasteProfile } from '@orm/entities/stats/statsTasteProfile.js';
import { StatsTasteProfileHidden } from '@orm/entities/stats/statsTasteProfileHidden.js';

import type {
  DTOAccountDataExportHiddenChannelRow,
  DTOAccountDataExportHiddenFromTasteProfileRow,
  DTOAccountDataExportListenEvent,
  DTOAccountDataExportListeningData,
  DTOAccountDataExportOpenEvent,
  DTOAccountDataExportTasteProfileRow,
} from '@podverse/helpers';

import { StatsListenerService } from './statsListener.js';

/**
 * Builds the export section for one account; never returns a listener id.
 */
export class ListeningDataExportService {
  private readonly listeners = new StatsListenerService();

  async getForAccount(account_id: number): Promise<DTOAccountDataExportListeningData> {
    const listener_id = await this.listeners.findListenerId(account_id);
    if (listener_id === null) {
      return emptyListeningData();
    }

    const manager = AppDataSourceReadWrite.manager;
    const tasteRows = await manager.getRepository(StatsTasteProfile).find({
      where: { listener_id },
      relations: { channel: true },
      order: { last_listened_at: 'DESC', channel_id: 'DESC' },
    });
    const hiddenRows = await manager.getRepository(StatsTasteProfileHidden).find({
      where: { listener_id },
      relations: { channel: true },
      order: { hidden_at: 'DESC' },
    });
    const channelHiddenRows = await manager.getRepository(StatsChannelHidden).find({
      where: { listener_id },
      relations: { channel: true },
      order: { hidden_at: 'DESC' },
    });
    const listenRows = await manager.getRepository(StatsListenEvent).find({
      where: { listener_id },
      relations: { channel: true, item: true, clip: true },
      order: { created_at: 'ASC' },
    });
    const openRows = await manager.getRepository(StatsOpenEvent).find({
      where: { listener_id },
      relations: { account: true, playlist: true },
      order: { created_at: 'ASC' },
    });

    return {
      taste_profile: tasteRows.map(toTasteProfileRow),
      hidden_from_taste_profile: hiddenRows.map(toHiddenRow),
      hidden_channels: channelHiddenRows.map(toChannelHiddenRow),
      listen_events: listenRows.map(toListenEvent),
      open_events: openRows.map(toOpenEvent),
    };
  }
}

function emptyListeningData(): DTOAccountDataExportListeningData {
  return {
    taste_profile: [],
    hidden_from_taste_profile: [],
    hidden_channels: [],
    listen_events: [],
    open_events: [],
  };
}

function toTasteProfileRow(row: StatsTasteProfile): DTOAccountDataExportTasteProfileRow {
  return {
    channel_id_text: row.channel.id_text,
    channel_title: row.channel.title,
    listen_count: row.listen_count,
    completion_count: row.completion_count,
    first_listened_at: row.first_listened_at.toISOString(),
    last_listened_at: row.last_listened_at.toISOString(),
    recent_score: row.recent_score,
    long_term_score: row.long_term_score,
    scores_updated_at: row.scores_updated_at.toISOString(),
    weight_override: row.weight_override,
    weight_override_at: row.weight_override_at?.toISOString() ?? null,
  };
}

function toHiddenRow(row: StatsTasteProfileHidden): DTOAccountDataExportHiddenFromTasteProfileRow {
  return {
    channel_id_text: row.channel.id_text,
    channel_title: row.channel.title,
    hidden_at: row.hidden_at.toISOString(),
  };
}

function toChannelHiddenRow(row: StatsChannelHidden): DTOAccountDataExportHiddenChannelRow {
  return {
    channel_id_text: row.channel.id_text,
    channel_title: row.channel.title,
    hidden_at: row.hidden_at.toISOString(),
  };
}

function toListenEvent(row: StatsListenEvent): DTOAccountDataExportListenEvent {
  return {
    created_at: row.created_at.toISOString(),
    channel_id_text: row.channel.id_text,
    item_id_text: row.item.id_text,
    item_title: row.item.title ?? null,
    clip_id_text: row.clip?.id_text ?? null,
    seconds_heard: row.seconds_heard,
    completed: row.completed,
  };
}

function toOpenEvent(row: StatsOpenEvent): DTOAccountDataExportOpenEvent {
  return {
    opened_at: row.created_at.toISOString(),
    account_id_text: row.account?.id_text ?? null,
    playlist_id_text: row.playlist?.id_text ?? null,
  };
}
