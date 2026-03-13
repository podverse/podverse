/**
 * MetaBoost payload for podcast:value (channel and item).
 * Used by DTOChannelValue and DTOItemValue.
 */
export interface DTOValueMetaBoost {
  type: string;
  schema: string;
  license?: string | null;
  node: string;
}
