import type { EmbedDemoPiSeedFeedDef } from '@podverse/helpers';
import type { EmbedDemoShowcaseId } from '@podverse/helpers';

export function shouldContinueSeedAfterParseFailure(feedExistedBeforeParse: boolean): boolean {
  return feedExistedBeforeParse;
}

export function feedDefRequiresItem(
  feedDef: EmbedDemoPiSeedFeedDef
): feedDef is EmbedDemoPiSeedFeedDef & { itemShowcaseId: EmbedDemoShowcaseId } {
  return feedDef.itemShowcaseId !== undefined;
}
