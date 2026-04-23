/**
 * Channel-level MetaBoost (`<podcast:metaBoost>`): RSS `standard` attribute + normalized `node` URL
 * (Partytime `PhasePendingMetaBoost`). Exposed on `DTOChannel.channel_meta_boost` (ORM relation name).
 */
export interface DTOChannelMetaBoost {
  standard: string;
  node: string;
}
