import { DTOItemEnclosureIntegrity } from './itemEnclosureIntegrity';
import { DTOItemEnclosureSource } from './itemEnclosureSource';

export interface DTOItemEnclosure {
  id: number;
  item_id: number;
  type: string;
  length?: number | null;
  bitrate?: number | null;
  height?: number | null;
  language?: string | null;
  title?: string | null;
  rel?: string | null;
  codecs?: string | null;
  item_enclosure_default: boolean;
  item_enclosure_integrity: DTOItemEnclosureIntegrity;
  item_enclosure_sources: DTOItemEnclosureSource[];
}
