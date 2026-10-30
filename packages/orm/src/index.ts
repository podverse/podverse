export type {
  DataSourceOptions,
  EntityManager,
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';

// Consumers building app-database connections use this DataSource so its type matches bindORMContext
export { DataSource } from 'typeorm';

// Config types for app-level configuration
export * from './config/index.js';

// Factory function to create the ORM context
export { bindORMContext, createORMContext } from './factory.js';
export type { BindORMContextInput, ORMContext } from './factory.js';

export { SnakeNamingStrategy } from './lib/snakeNamingStrategy.js';
export {
  findOptionsRelationsFromPaths,
  mergeFindOptionsRelations,
} from './lib/findOptionsRelationsFromPaths.js';

// Context accessors for advanced use cases
export {
  getDataSourceRead,
  getDataSourceReadWrite,
  getLoggerService,
  getORMConfig,
} from './context.js';

// DB connection exports.
export * from './db/index.js';

export * from './entities/account/account.js';
export * from './entities/account/accountContentLog.js';
export * from './entities/account/accountCredentials.js';
export * from './entities/account/accountEmailChangeVerification.js';
export * from './entities/account/accountDeviceAutoDownloadChannel.js';
export * from './entities/account/accountFCMDevice.js';
export * from './entities/account/accountFollowingAccount.js';
export * from './entities/account/accountFollowingAddByRSSChannel.js';
export * from './entities/account/accountFollowingChannel.js';
export * from './entities/account/accountFollowingPlaylist.js';
export * from './entities/account/accountPendingFollowingChannel.js';
export * from './entities/account/accountMembership.js';
export * from './entities/account/accountMembershipStatus.js';
export * from './entities/account/accountMetaboost.js';
export * from './entities/account/adminNotificationCampaign.js';
export * from './entities/account/accountNotification.js';
export * from './entities/account/accountTermsAcceptance.js';
export * from './entities/account/accountNotificationChannel.js';
export * from './entities/account/accountNotificationChannelType.js';
export * from './entities/account/accountNotificationPreference.js';
export * from './entities/account/accountProfile.js';
export * from './entities/account/accountResetPassword.js';
export * from './entities/account/accountSession.js';
export * from './entities/account/accountApiKey.js';
export * from './entities/account/accountSetPassword.js';
export * from './entities/account/accountSettings/accountSettings.js';
export * from './entities/account/accountSettings/accountSettingsLocale.js';
export * from './entities/account/accountSettings/accountSettingsNotification.js';
export * from './entities/account/accountSettings/accountSettingsNotificationType.js';
export * from './entities/account/accountSettings/accountSettingsPlayback.js';
export * from './entities/account/accountUPDevice.js';
export * from './entities/account/accountVerification.js';
export * from './entities/account/accountWebPushDevice.js';
export * from './entities/account/scheduledJob.js';

export * from './entities/channel/channel.js';
export * from './entities/channel/channelAbout.js';
export * from './entities/channel/channelCategory.js';
export * from './entities/channel/channelChat.js';
export * from './entities/channel/channelDescription.js';
export * from './entities/channel/channelFunding.js';
export * from './entities/channel/channelImage.js';
export * from './entities/channel/channelInternalSettings.js';
export * from './entities/channel/channelItunesType.js';
export * from './entities/channel/channelLicense.js';
export * from './entities/channel/channelLocation.js';
export * from './entities/channel/channelPerson.js';
export * from './entities/channel/channelPodroll.js';
export * from './entities/channel/channelPodrollRemoteItem.js';
export * from './entities/channel/channelPublisher.js';
export * from './entities/channel/channelPublisherRemoteItem.js';
export * from './entities/channel/channelRemoteItem.js';
export * from './entities/channel/channelVerifiedPublisher.js';
export * from './entities/channel/channelSeason.js';
export * from './entities/channel/channelSocialInteract.js';
export * from './entities/channel/channelTrailer.js';
export * from './entities/channel/channelTxt.js';
export * from './entities/channel/channelValue.js';
export * from './entities/channel/channelMerge.js';
export * from './entities/channel/channelMergeJournal.js';
export * from './entities/remoteStub/remoteChannelStub.js';
export * from './entities/remoteStub/remoteChannelStubAlias.js';
export * from './entities/remoteStub/remoteItemStub.js';
export * from './entities/channel/channelMetaBoost.js';
export * from './entities/channel/channelValueRecipient.js';
export * from './entities/channel/itemMergeMap.js';
export * from './entities/channel/podcastIndexDeadFeedSync.js';

export * from './entities/feed/feed.js';
export * from './entities/feed/feedCondition.js';
export * from './entities/feed/feedConditionType.js';
export * from './entities/feed/feedTakedownReason.js';
export * from './entities/feed/feedLifecycleEvent.js';
export * from './entities/feed/feedLifecycleState.js';
export * from './entities/feed/feedLifecycleStateType.js';
export * from './entities/feed/feedLifecycleUpdateSource.js';
export * from './entities/feed/feedLog.js';
export * from './entities/feed/feedPolicy.js';
export * from './entities/feed/feedPolicyOverride.js';

export * from './entities/item/item.js';
export * from './entities/item/itemAbout.js';
export * from './entities/item/itemFlagStatus.js';
export * from './entities/item/itemChapter.js';
export * from './entities/item/itemChapterLocation.js';
export * from './entities/item/itemChaptersFeed.js';
export * from './entities/item/itemChaptersObject.js';
export * from './entities/item/itemChaptersFeedLog.js';
export * from './entities/item/itemChat.js';
export * from './entities/item/itemContentLink.js';
export * from './entities/item/itemDescription.js';
export * from './entities/item/itemEnclosure.js';
export * from './entities/item/itemEnclosureIntegrity.js';
export * from './entities/item/itemEnclosureSource.js';
export * from './entities/item/itemFunding.js';
export * from './entities/item/itemImage.js';
export * from './entities/item/itemItunesEpisodeType.js';
export * from './entities/item/itemLicense.js';
export * from './entities/item/itemLocation.js';
export * from './entities/item/itemPerson.js';
export * from './entities/item/itemSeason.js';
export * from './entities/item/itemSeasonEpisode.js';
export * from './entities/item/itemSocialInteract.js';
export * from './entities/item/itemSoundbite.js';
export * from './entities/item/itemTranscript.js';
export * from './entities/item/itemTxt.js';
export * from './entities/item/itemValue.js';
export * from './entities/item/itemValueRecipient.js';
export * from './entities/item/itemValueTimeSplit.js';
export * from './entities/item/itemValueTimeSplitRecipient.js';
export * from './entities/item/itemValueTimeSplitRemoteItem.js';

export * from './entities/liveItem/liveItem.js';
export * from './entities/liveItem/liveItemStatus.js';

export * from './entities/playlist/playlist.js';
export * from './entities/playlist/playlistResource.js';

export * from './entities/queue/queue.js';
export * from './entities/queue/queueResource.js';

export * from './entities/category.js';
export * from './entities/billingCheckoutChannel.js';
export * from './entities/billingCheckoutSession.js';
export * from './entities/billingMembershipGrant.js';
export * from './entities/billingProcessor.js';
export * from './entities/billingProcessorProduct.js';
export * from './entities/billingPrice.js';
export * from './entities/billingPriceChangeAudit.js';
export * from './entities/billingProduct.js';
export * from './entities/billingTransaction.js';
export * from './entities/billingWebhookEvent.js';
export * from './entities/clip.js';
export * from './entities/medium.js';
export * from './entities/embedDemoShowcase.js';
export * from './entities/imageShrinkSource.js';
export * from './entities/membershipClaimToken.js';
export * from './entities/productMembershipSettings.js';
export * from './entities/sharableStatus.js';

export * from './entities/stats/statsDailyAccount.js';
export * from './entities/stats/statsDailyChannel.js';
export * from './entities/stats/statsDailyClip.js';
export * from './entities/stats/statsDailyItem.js';
export * from './entities/stats/statsDailyPlaylist.js';
export * from './entities/stats/statsListenEvent.js';
export * from './entities/stats/statsOpenEvent.js';
export * from './entities/stats/statsPopularityAccount.js';
export * from './entities/stats/statsPopularityChannel.js';
export * from './entities/stats/statsPopularityClip.js';
export * from './entities/stats/statsPopularityItem.js';
export * from './entities/stats/statsPopularityPlaylist.js';
export * from './entities/stats/statsRecommendation.js';
export * from './entities/stats/statsRecommendationState.js';
export * from './entities/stats/statsShowSimilarity.js';
export * from './entities/stats/statsShowSimilarityState.js';
export * from './entities/stats/statsTasteProfile.js';
export * from './entities/stats/statsTasteProfileHidden.js';
export * from './entities/stats/statsFlaggedListener.js';
export * from './entities/stats/statsFlagSignal.js';

export * from './lib/typeORMTypes.js';
export * from './lib/nanoid.js';
export * from './lib/billingLimits.js';
export * from './lib/verifiedPublisherMatch.js';
export * from './lib/feedLifecycleLimits.js';
export * from './lib/feedTableLimits.js';
export * from './lib/feedLifecycleState.js';
export * from './lib/feedLifecycleTransitionValidation.js';
export * from './lib/feedSpamThresholds.js';
export * from './lib/duplicateFeedMatch.js';
export * from './lib/postgresUniqueViolation.js';
export { hashPassword } from './lib/password.js';

export * from './services/category.js';
export * from './services/billingCheckoutChannel.js';
export * from './services/billingCheckoutSession.js';
export * from './services/billingPriceCatalog.js';
export * from './services/billingEntitlement.js';
export * from './services/billingMembershipExtension.js';
export * from './services/billingMembershipGrant.js';
export * from './services/billingProcessorProduct.js';
export * from './services/billingTransaction.js';
export * from './services/billingWebhookEvent.js';

export * from './services/account/account.js';
export * from './services/account/adminNotificationCampaign.js';
export * from './services/account/adminNotificationCampaignDispatch.js';
export * from './services/account/adminNotificationCampaignScheduler.js';
export * from './services/account/createAccountNotificationWithOptionalPush.js';
export * from './services/account/accountCredentials.js';
export * from './services/account/accountDataExport.js';
export * from './services/account/accountEmailChangeVerification.js';
export * from './services/account/accountDeviceAutoDownloadChannel.js';
export * from './services/account/accountFCMDevice.js';
export * from './services/account/accountFollowingAccount.js';
export * from './services/account/accountFollowingAddByRSSChannel.js';
export * from './services/account/accountFollowingChannel.js';
export * from './services/account/accountFollowingPlaylist.js';
export * from './services/account/accountPendingFollowingChannel.js';
export * from './services/account/accountMembership.js';
export * from './services/account/accountMembershipStatus.js';
export * from './services/account/accountMetaboost.js';
export * from './lib/accountEventPublisher.js';
export * from './services/account/accountNotification.js';
export * from './services/account/accountNotificationSignal.js';
export * from './services/account/accountTermsAcceptance.js';
export * from './services/account/accountNotificationChannel.js';
export * from './services/account/accountNotificationChannelType.js';
export * from './services/account/accountNotificationPreference.js';
export * from './services/account/accountProfile.js';
export * from './services/account/accountResetPassword.js';
export * from './services/account/accountSession.js';
export * from './services/account/accountSessionSignal.js';
export * from './services/account/accountApiKey.js';
export * from './services/account/accountSetPassword.js';
export * from './services/account/scheduledJob.js';
export * from './services/account/accountSettings/accountSettingsListenStats.js';
export * from './services/account/accountSettings/accountSettingsLocale.js';
export * from './services/account/accountSettings/accountSettingsNotification.js';
export * from './services/account/accountSettings/accountSettingsNotificationType.js';
export * from './services/account/accountSettings/accountSettingsPlayback.js';
export * from './services/account/accountUPDevice.js';
export * from './services/account/accountVerification.js';
export * from './services/account/accountWebPushDevice.js';
export * from './services/accountContentLog.js';
export * from './services/archivedChannelCleanup.js';
export * from './services/archivedFollowConversion.js';
export * from './services/archivedSlimming.js';
export * from './services/archiver.js';
export * from './services/removedReferences.js';

export * from './services/channel/channel.js';
export * from './services/channel/channelAbout.js';
export * from './services/channel/channelAddByRSSDirectoryMatch.js';
export * from './services/channel/channelChat.js';
export * from './services/channel/channelCategory.js';
export * from './services/channel/channelDescription.js';
export * from './services/channel/channelFunding.js';
export * from './services/channel/channelImage.js';
export * from './services/channel/channelLicense.js';
export * from './services/channel/channelLocation.js';
export * from './services/channel/channelPerson.js';
export * from './services/channel/channelPodroll.js';
export * from './services/channel/channelPodrollRemoteItem.js';
export * from './services/channel/channelPublisher.js';
export * from './services/channel/channelPublisherRemoteItem.js';
export * from './services/channel/channelRemoteItem.js';
export * from './services/channel/channelVerifiedPublisher.js';
export * from './services/channel/channelSeason.js';
export * from './services/channel/channelSocialInteract.js';
export * from './services/channel/channelTrailer.js';
export * from './services/channel/channelTxt.js';
export * from './services/channel/channelValue.js';
export * from './services/channel/channelMerge.js';
export * from './services/channel/channelMergeRedirect.js';
export * from './services/channel/channelMergeJournal.js';
export * from './services/remoteStub/remoteChannelStub.js';
export * from './services/remoteStub/remoteItemStub.js';
export * from './services/remoteStub/remoteStubDto.js';
export * from './services/channel/channelMetaBoost.js';
export * from './services/channel/channelValueRecipient.js';
export * from './services/channel/itemMergeMap.js';
export * from './services/channel/podcastIndexDeadFeedSync.js';

export * from './services/clip.js';

export * from './services/channel/applyChannelMerge.js';
export * from './services/embedDemoConfig.js';
export * from './services/imageShrinkSource.js';

export * from './services/feed/feed.js';
export * from './services/feed/feedForceReparseScheduler.js';
export * from './services/remoteStub/remoteStubJobScheduler.js';
export * from './services/feed/feedTakedownReason.js';
export * from './services/feed/feedLifecycleState.js';
export * from './services/feed/feedLog.js';
export * from './services/feed/feedPolicy.js';

export * from './services/item/item.js';
export * from './services/item/itemAbout.js';
export * from './services/item/itemChapter.js';
export * from './services/item/itemChaptersFeed.js';
export * from './services/item/itemChaptersObject.js';
export * from './services/item/itemChaptersFeedLog.js';
export * from './services/item/itemChat.js';
export * from './services/item/itemContentLink.js';
export * from './services/item/itemDescription.js';
export * from './services/item/itemEnclosure.js';
export * from './services/item/itemEnclosureIntegrity.js';
export * from './services/item/itemEnclosureSource.js';
export * from './services/item/itemFunding.js';
export * from './services/item/itemImage.js';
export * from './services/item/itemLicense.js';
export * from './services/item/itemLocation.js';
export * from './services/item/itemPerson.js';
export * from './services/item/itemSeason.js';
export * from './services/item/itemSeasonEpisode.js';
export * from './services/item/itemSocialInteract.js';
export * from './services/item/itemSoundbite.js';
export * from './services/item/itemTranscript.js';
export * from './services/item/itemTxt.js';
export * from './services/item/itemValue.js';
export * from './services/item/itemValueRecipient.js';
export * from './services/item/itemValueTimeSplit.js';
export * from './services/item/itemValueTimeSplitRecipient.js';
export * from './services/item/itemValueTimeSplitRemoteItem.js';

export * from './services/liveItem/liveItem.js';

export * from './services/medium.js';

export * from './services/membershipClaimToken.js';

export * from './services/onDemandParserEvent.js';

export * from './services/playlist/playlist.js';
export * from './services/playlist/playlistResource.js';

export * from './services/publisherFeed.js';
export * from './services/remoteItemReference/remoteItemReference.js';

export * from './services/queue/queue.js';
export * from './services/queue/queueResource.js';
export * from './services/queue/queueResourceActiveItemFilter.js';

export * from './services/stats/statsDailyDevSeed.js';
export * from './services/stats/statsEventPartitions.js';
export * from './services/stats/statsPopularityRefresh.js';
export * from './services/stats/recommendationsRefresh.js';
export * from './services/stats/popularity/statsPopularityAccount.js';
export * from './services/stats/popularity/statsPopularityChannel.js';
export * from './services/stats/popularity/statsPopularityClip.js';
export * from './services/stats/popularity/statsPopularityItem.js';
export * from './services/stats/popularity/statsPopularityPlaylist.js';
export * from './services/stats/listenerIdentity/listeningDataDeletion.js';
export * from './services/stats/listenerIdentity/listeningDataExport.js';
export * from './services/stats/listenerIdentity/tasteProfileAccount.js';
export * from './services/stats/listenerIdentity/statsListenWrite.js';
export * from './services/stats/listenerIdentity/statsOpenWrite.js';
