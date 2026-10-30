import { Account } from '@orm/entities/account/account.js';
import { AccountApiKey } from '@orm/entities/account/accountApiKey.js';
import { AccountContentLog } from '@orm/entities/account/accountContentLog.js';
import { AccountCredentials } from '@orm/entities/account/accountCredentials.js';
import { AccountDeviceAutoDownloadChannel } from '@orm/entities/account/accountDeviceAutoDownloadChannel.js';
import { AccountEmailChangeVerification } from '@orm/entities/account/accountEmailChangeVerification.js';
import { AccountFCMDevice } from '@orm/entities/account/accountFCMDevice.js';
import { AccountFollowingAccount } from '@orm/entities/account/accountFollowingAccount.js';
import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel.js';
import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel.js';
import { AccountFollowingPlaylist } from '@orm/entities/account/accountFollowingPlaylist.js';
import { AccountMembership } from '@orm/entities/account/accountMembership.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { AccountMetaboost } from '@orm/entities/account/accountMetaboost.js';
import { AccountNotification } from '@orm/entities/account/accountNotification.js';
import { AccountNotificationChannel } from '@orm/entities/account/accountNotificationChannel.js';
import { AccountNotificationChannelType } from '@orm/entities/account/accountNotificationChannelType.js';
import { AccountNotificationPreference } from '@orm/entities/account/accountNotificationPreference.js';
import { AccountPendingFollowingChannel } from '@orm/entities/account/accountPendingFollowingChannel.js';
import { AccountProfile } from '@orm/entities/account/accountProfile.js';
import { AccountResetPassword } from '@orm/entities/account/accountResetPassword.js';
import { AccountSession } from '@orm/entities/account/accountSession.js';
import { AccountSetPassword } from '@orm/entities/account/accountSetPassword.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import { AccountSettingsLocale } from '@orm/entities/account/accountSettings/accountSettingsLocale.js';
import { AccountSettingsNotification } from '@orm/entities/account/accountSettings/accountSettingsNotification.js';
import { AccountSettingsNotificationType } from '@orm/entities/account/accountSettings/accountSettingsNotificationType.js';
import { AccountSettingsPlayback } from '@orm/entities/account/accountSettings/accountSettingsPlayback.js';
import { AccountTermsAcceptance } from '@orm/entities/account/accountTermsAcceptance.js';
import { AccountUPDevice } from '@orm/entities/account/accountUPDevice.js';
import { AccountVerification } from '@orm/entities/account/accountVerification.js';
import { AccountWebPushDevice } from '@orm/entities/account/accountWebPushDevice.js';
import { AdminNotificationCampaign } from '@orm/entities/account/adminNotificationCampaign.js';
import { ScheduledJob } from '@orm/entities/account/scheduledJob.js';
import { BillingCheckoutChannel } from '@orm/entities/billingCheckoutChannel.js';
import { BillingCheckoutSession } from '@orm/entities/billingCheckoutSession.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import { BillingPrice } from '@orm/entities/billingPrice.js';
import { BillingPriceChangeAudit } from '@orm/entities/billingPriceChangeAudit.js';
import { BillingProcessor } from '@orm/entities/billingProcessor.js';
import { BillingProcessorProduct } from '@orm/entities/billingProcessorProduct.js';
import { BillingProduct } from '@orm/entities/billingProduct.js';
import { BillingTransaction } from '@orm/entities/billingTransaction.js';
import { BillingWebhookEvent } from '@orm/entities/billingWebhookEvent.js';
import { Category } from '@orm/entities/category.js';
import { Channel } from '@orm/entities/channel/channel.js';
import { ChannelAbout } from '@orm/entities/channel/channelAbout.js';
import { ChannelCategory } from '@orm/entities/channel/channelCategory.js';
import { ChannelChat } from '@orm/entities/channel/channelChat.js';
import { ChannelDescription } from '@orm/entities/channel/channelDescription.js';
import { ChannelFunding } from '@orm/entities/channel/channelFunding.js';
import { ChannelImage } from '@orm/entities/channel/channelImage.js';
import { ChannelInternalSettings } from '@orm/entities/channel/channelInternalSettings.js';
import { ChannelItunesType } from '@orm/entities/channel/channelItunesType.js';
import { ChannelLicense } from '@orm/entities/channel/channelLicense.js';
import { ChannelLocation } from '@orm/entities/channel/channelLocation.js';
import { ChannelMerge } from '@orm/entities/channel/channelMerge.js';
import { ChannelMergeJournal } from '@orm/entities/channel/channelMergeJournal.js';
import { ChannelMetaBoost } from '@orm/entities/channel/channelMetaBoost.js';
import { ChannelPerson } from '@orm/entities/channel/channelPerson.js';
import { ChannelPodroll } from '@orm/entities/channel/channelPodroll.js';
import { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem.js';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher.js';
import { ChannelPublisherRemoteItem } from '@orm/entities/channel/channelPublisherRemoteItem.js';
import { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem.js';
import { ChannelSeason } from '@orm/entities/channel/channelSeason.js';
import { ChannelSocialInteract } from '@orm/entities/channel/channelSocialInteract.js';
import { ChannelTrailer } from '@orm/entities/channel/channelTrailer.js';
import { ChannelTxt } from '@orm/entities/channel/channelTxt.js';
import { ChannelValue } from '@orm/entities/channel/channelValue.js';
import { ChannelValueRecipient } from '@orm/entities/channel/channelValueRecipient.js';
import { ChannelVerifiedPublisher } from '@orm/entities/channel/channelVerifiedPublisher.js';
import { ItemMergeMap } from '@orm/entities/channel/itemMergeMap.js';
import { PodcastIndexDeadFeedSync } from '@orm/entities/channel/podcastIndexDeadFeedSync.js';
import { Clip } from '@orm/entities/clip.js';
import { Feed } from '@orm/entities/feed/feed.js';
import { FeedCondition } from '@orm/entities/feed/feedCondition.js';
import { FeedConditionType } from '@orm/entities/feed/feedConditionType.js';
import { FeedLifecycleEvent } from '@orm/entities/feed/feedLifecycleEvent.js';
import { FeedLifecycleState } from '@orm/entities/feed/feedLifecycleState.js';
import { FeedLifecycleStateType } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedLog } from '@orm/entities/feed/feedLog.js';
import { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import { FeedPolicyOverride } from '@orm/entities/feed/feedPolicyOverride.js';
import { FeedTakedownReason } from '@orm/entities/feed/feedTakedownReason.js';
import { Item } from '@orm/entities/item/item.js';
import { ItemAbout } from '@orm/entities/item/itemAbout.js';
import { ItemChapter } from '@orm/entities/item/itemChapter.js';
import { ItemChapterLocation } from '@orm/entities/item/itemChapterLocation.js';
import { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import { ItemChaptersFeedLog } from '@orm/entities/item/itemChaptersFeedLog.js';
import { ItemChaptersObject } from '@orm/entities/item/itemChaptersObject.js';
import { ItemChat } from '@orm/entities/item/itemChat.js';
import { ItemContentLink } from '@orm/entities/item/itemContentLink.js';
import { ItemDescription } from '@orm/entities/item/itemDescription.js';
import { ItemEnclosure } from '@orm/entities/item/itemEnclosure.js';
import { ItemEnclosureIntegrity } from '@orm/entities/item/itemEnclosureIntegrity.js';
import { ItemEnclosureSource } from '@orm/entities/item/itemEnclosureSource.js';
import { ItemFlagStatus } from '@orm/entities/item/itemFlagStatus.js';
import { ItemFunding } from '@orm/entities/item/itemFunding.js';
import { ItemImage } from '@orm/entities/item/itemImage.js';
import { ItemItunesEpisodeType } from '@orm/entities/item/itemItunesEpisodeType.js';
import { ItemLicense } from '@orm/entities/item/itemLicense.js';
import { ItemLocation } from '@orm/entities/item/itemLocation.js';
import { ItemPerson } from '@orm/entities/item/itemPerson.js';
import { ItemSeason } from '@orm/entities/item/itemSeason.js';
import { ItemSeasonEpisode } from '@orm/entities/item/itemSeasonEpisode.js';
import { ItemSocialInteract } from '@orm/entities/item/itemSocialInteract.js';
import { ItemSoundbite } from '@orm/entities/item/itemSoundbite.js';
import { ItemTranscript } from '@orm/entities/item/itemTranscript.js';
import { ItemTxt } from '@orm/entities/item/itemTxt.js';
import { ItemValue } from '@orm/entities/item/itemValue.js';
import { ItemValueRecipient } from '@orm/entities/item/itemValueRecipient.js';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit.js';
import { ItemValueTimeSplitRecipient } from '@orm/entities/item/itemValueTimeSplitRecipient.js';
import { ItemValueTimeSplitRemoteItem } from '@orm/entities/item/itemValueTimeSplitRemoteItem.js';
import { LiveItem } from '@orm/entities/liveItem/liveItem.js';
import { LiveItemStatus } from '@orm/entities/liveItem/liveItemStatus.js';
import { Medium } from '@orm/entities/medium.js';
import { MembershipClaimToken } from '@orm/entities/membershipClaimToken.js';
import { OnDemandParserEvent } from '@orm/entities/onDemandParserEvent.js';
import { Playlist } from '@orm/entities/playlist/playlist.js';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource.js';
import { ProductMembershipSettings } from '@orm/entities/productMembershipSettings.js';
import { Queue } from '@orm/entities/queue/queue.js';
import { QueueResource } from '@orm/entities/queue/queueResource.js';
import { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import { RemoteChannelStubAlias } from '@orm/entities/remoteStub/remoteChannelStubAlias.js';
import { RemoteItemStub } from '@orm/entities/remoteStub/remoteItemStub.js';
import { SharableStatus } from '@orm/entities/sharableStatus.js';
import { StatsDailyAccount } from '@orm/entities/stats/statsDailyAccount.js';
import { StatsDailyChannel } from '@orm/entities/stats/statsDailyChannel.js';
import { StatsDailyClip } from '@orm/entities/stats/statsDailyClip.js';
import { StatsDailyItem } from '@orm/entities/stats/statsDailyItem.js';
import { StatsDailyPlaylist } from '@orm/entities/stats/statsDailyPlaylist.js';
import { StatsFlaggedListener } from '@orm/entities/stats/statsFlaggedListener.js';
import { StatsFlagSignal } from '@orm/entities/stats/statsFlagSignal.js';
import { StatsListener } from '@orm/entities/stats/statsListener.js';
import { StatsListenEvent } from '@orm/entities/stats/statsListenEvent.js';
import { StatsOpenEvent } from '@orm/entities/stats/statsOpenEvent.js';
import { StatsPopularityAccount } from '@orm/entities/stats/statsPopularityAccount.js';
import { StatsPopularityChannel } from '@orm/entities/stats/statsPopularityChannel.js';
import { StatsPopularityClip } from '@orm/entities/stats/statsPopularityClip.js';
import { StatsPopularityItem } from '@orm/entities/stats/statsPopularityItem.js';
import { StatsPopularityPlaylist } from '@orm/entities/stats/statsPopularityPlaylist.js';
import { StatsRecommendation } from '@orm/entities/stats/statsRecommendation.js';
import { StatsRecommendationState } from '@orm/entities/stats/statsRecommendationState.js';
import { StatsShowSimilarity } from '@orm/entities/stats/statsShowSimilarity.js';
import { StatsShowSimilarityState } from '@orm/entities/stats/statsShowSimilarityState.js';
import { StatsTasteProfile } from '@orm/entities/stats/statsTasteProfile.js';
import { StatsTasteProfileHidden } from '@orm/entities/stats/statsTasteProfileHidden.js';

import { EmbedDemoShowcase } from '../entities/embedDemoShowcase.js';
import { ImageShrinkSource } from '../entities/imageShrinkSource.js';

export const entities = [
  Account,
  AccountContentLog,
  AccountCredentials,
  AccountEmailChangeVerification,
  AccountDeviceAutoDownloadChannel,
  AccountFCMDevice,
  AccountFollowingAccount,
  AccountFollowingAddByRSSChannel,
  AccountFollowingChannel,
  AccountFollowingPlaylist,
  AccountPendingFollowingChannel,
  AccountMembership,
  AccountMembershipStatus,
  AccountMetaboost,
  AdminNotificationCampaign,
  AccountNotification,
  AccountTermsAcceptance,
  AccountNotificationChannel,
  AccountNotificationChannelType,
  AccountNotificationPreference,
  AccountProfile,
  AccountResetPassword,
  AccountSession,
  AccountApiKey,
  AccountSetPassword,
  AccountSettings,
  AccountSettingsLocale,
  AccountSettingsNotification,
  AccountSettingsNotificationType,
  AccountSettingsPlayback,
  AccountUPDevice,
  AccountWebPushDevice,
  AccountVerification,
  BillingCheckoutChannel,
  BillingCheckoutSession,
  BillingMembershipGrant,
  BillingProcessor,
  BillingProcessorProduct,
  BillingPrice,
  BillingPriceChangeAudit,
  BillingProduct,
  BillingTransaction,
  BillingWebhookEvent,
  Category,
  Channel,
  ChannelAbout,
  ChannelCategory,
  ChannelChat,
  ChannelDescription,
  ChannelFunding,
  ChannelImage,
  ChannelInternalSettings,
  ChannelItunesType,
  ChannelLicense,
  ChannelLocation,
  ChannelPerson,
  ChannelPodroll,
  ChannelPodrollRemoteItem,
  ChannelPublisher,
  ChannelPublisherRemoteItem,
  ChannelRemoteItem,
  ChannelVerifiedPublisher,
  ChannelSeason,
  ChannelSocialInteract,
  ChannelTrailer,
  ChannelTxt,
  ChannelMetaBoost,
  ChannelMerge,
  ChannelMergeJournal,
  ChannelValue,
  ChannelValueRecipient,
  ItemMergeMap,
  PodcastIndexDeadFeedSync,
  Clip,
  Feed,
  FeedCondition,
  FeedConditionType,
  FeedLifecycleEvent,
  FeedLifecycleState,
  FeedLifecycleStateType,
  FeedTakedownReason,
  FeedLog,
  FeedPolicy,
  FeedPolicyOverride,
  EmbedDemoShowcase,
  ImageShrinkSource,
  Item,
  ItemAbout,
  ItemChapter,
  ItemChapterLocation,
  ItemChaptersFeed,
  ItemChaptersObject,
  ItemChaptersFeedLog,
  ItemChat,
  ItemContentLink,
  ItemDescription,
  ItemEnclosure,
  ItemEnclosureIntegrity,
  ItemEnclosureSource,
  ItemFlagStatus,
  ItemFunding,
  ItemImage,
  ItemItunesEpisodeType,
  ItemLicense,
  ItemLocation,
  ItemPerson,
  ItemSeason,
  ItemSeasonEpisode,
  ItemSocialInteract,
  ItemSoundbite,
  ItemTranscript,
  ItemTxt,
  ItemValue,
  ItemValueRecipient,
  ItemValueTimeSplit,
  ItemValueTimeSplitRecipient,
  ItemValueTimeSplitRemoteItem,
  LiveItem,
  LiveItemStatus,
  MembershipClaimToken,
  Medium,
  OnDemandParserEvent,
  Playlist,
  PlaylistResource,
  ProductMembershipSettings,
  Queue,
  QueueResource,
  RemoteChannelStub,
  RemoteChannelStubAlias,
  RemoteItemStub,
  ScheduledJob,
  SharableStatus,
  StatsDailyAccount,
  StatsDailyChannel,
  StatsDailyClip,
  StatsDailyItem,
  StatsDailyPlaylist,
  StatsListener,
  StatsListenEvent,
  StatsOpenEvent,
  StatsPopularityAccount,
  StatsPopularityChannel,
  StatsPopularityClip,
  StatsPopularityItem,
  StatsPopularityPlaylist,
  StatsRecommendation,
  StatsRecommendationState,
  StatsShowSimilarity,
  StatsShowSimilarityState,
  StatsTasteProfile,
  StatsTasteProfileHidden,
  StatsFlaggedListener,
  StatsFlagSignal,
];
