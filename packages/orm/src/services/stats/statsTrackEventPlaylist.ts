import type { Playlist } from '@orm/entities/playlist/playlist.js';
import { BaseStatsTrackEventService } from './baseStatsTrackEvent.js';
import { StatsTrackEventPlaylist } from '@orm/entities/stats/statsTrackEventPlaylist.js';
import { PlaylistService } from '@orm/services/playlist/playlist.js';

export class StatsTrackEventPlaylistService extends BaseStatsTrackEventService<StatsTrackEventPlaylist> {
  protected entity = StatsTrackEventPlaylist;
  protected entityName = 'stats_track_event_playlist';
  protected entityIdField = 'playlist_id';
  protected entityIdTextField = 'playlist_id_text';
  private playlistService: PlaylistService;

  constructor() {
    super();
    this.playlistService = new PlaylistService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Playlist | null | undefined> {
    return this.playlistService.getByIdText(id_text);
  }
}
