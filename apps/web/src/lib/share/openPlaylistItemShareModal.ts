import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  DTOPlaylist,
} from '@podverse/helpers';

import type { ModalShare } from '../../contexts/Modals';
import { defaultModalShare } from '../../contexts/Modals';

type OpenPlaylistItemShareModalInput = {
  channel: DTOChannel;
  item: DTOItem | null;
  clip?: DTOClip | null;
  item_soundbite?: DTOItemSoundbite | null;
  playlist_id_text: string;
  playlist_item_id_text: string;
};

export function buildPlaylistItemShareModalState(
  input: OpenPlaylistItemShareModalInput
): ModalShare {
  return {
    ...defaultModalShare,
    channel: input.channel,
    item: input.item,
    clip: input.clip ?? null,
    item_chapter: null,
    item_soundbite: input.item_soundbite ?? null,
    playlist: { id_text: input.playlist_id_text } as DTOPlaylist,
    playlist_item: input.playlist_item_id_text,
  };
}
