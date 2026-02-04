import type { DTOChannel, DTOItem } from '@podverse/helpers';

import type { ViewSelectedOption } from '../../../ViewSelector/ViewSelector';

export type EpisodeListRowProps = {
  channel: DTOChannel;
  item: DTOItem;
  showChannelInfo?: boolean;
  isEditModeQueue?: boolean;
  removeFromQueue?: () => void;
  isEditModePlaylist?: boolean;
  removeFromPlaylist?: () => void;
  playlist_id_text: string | null;
};

export type EpisodeListGridNodeProps = {
  channel: DTOChannel;
  item: DTOItem;
  showChannelInfo?: boolean;
};

export type EpisodeListNodesProps = {
  channel: DTOChannel | null;
  items: DTOItem[];
  viewSelected: ViewSelectedOption;
  showChannelInfo?: boolean;
};
