import { Account } from '@orm/entities/account/account.js';
import { AccountAppStorePurchase } from '@orm/entities/account/accountAppStorePurchase.js';
import { AccountCredentials } from '@orm/entities/account/accountCredentials.js';
import { AccountEmailChangeVerification } from '@orm/entities/account/accountEmailChangeVerification.js';
import { AccountFCMDevice } from '@orm/entities/account/accountFCMDevice.js';
import { AccountFollowingAccount } from '@orm/entities/account/accountFollowingAccount.js';
import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel.js';
import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel.js';
import { AccountFollowingPlaylist } from '@orm/entities/account/accountFollowingPlaylist.js';
import { AccountGooglePlayPurchase } from '@orm/entities/account/accountGooglePlayPurchase.js';
import { AccountMembership } from '@orm/entities/account/accountMembership.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { AccountNotificationChannel } from '@orm/entities/account/accountNotificationChannel.js';
import { AccountNotificationChannelType } from '@orm/entities/account/accountNotificationChannelType.js';
import { AccountPayPalOrder } from '@orm/entities/account/accountPayPalOrder.js';
import { AccountProfile } from '@orm/entities/account/accountProfile.js';
import { AccountResetPassword } from '@orm/entities/account/accountResetPassword.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import { AccountSettingsLocale } from '@orm/entities/account/accountSettings/accountSettingsLocale.js';
import { AccountSettingsNotification } from '@orm/entities/account/accountSettings/accountSettingsNotification.js';
import { AccountSettingsNotificationType } from '@orm/entities/account/accountSettings/accountSettingsNotificationType.js';
import { AccountUPDevice } from '@orm/entities/account/accountUPDevice.js';
import { AccountWebPushDevice } from '@orm/entities/account/accountWebPushDevice.js';
import { AccountVerification } from '@orm/entities/account/accountVerification.js';
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
import { ChannelValueMetaBoost } from '@orm/entities/channel/channelValueMetaBoost.js';
import { ChannelValueRecipient } from '@orm/entities/channel/channelValueRecipient.js';
import { Clip } from '@orm/entities/clip.js';
import { Feed } from '@orm/entities/feed/feed.js';
import { FeedFlagStatus } from '@orm/entities/feed/feedFlagStatus.js';
import { FeedLog } from '@orm/entities/feed/feedLog.js';
import { ImageShrinkSource } from '../entities/imageShrinkSource.js';
import { Item } from '@orm/entities/item/item.js';
import { ItemAbout } from '@orm/entities/item/itemAbout.js';
import { ItemChapter } from '@orm/entities/item/itemChapter.js';
import { ItemChapterLocation } from '@orm/entities/item/itemChapterLocation.js';
import { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import { ItemChaptersObject } from '@orm/entities/item/itemChaptersObject.js';
import { ItemChaptersFeedLog } from '@orm/entities/item/itemChaptersFeedLog.js';
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
import { ItemValueMetaBoost } from '@orm/entities/item/itemValueMetaBoost.js';
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
import { Queue } from '@orm/entities/queue/queue.js';
import { QueueResource } from '@orm/entities/queue/queueResource.js';
import { SharableStatus } from '@orm/entities/sharableStatus.js';
import { StatsAggregatedAccount } from '@orm/entities/stats/statsAggregatedAccount.js';
import { StatsAggregatedChannel } from '@orm/entities/stats/statsAggregatedChannel.js';
import { StatsAggregatedClip } from '@orm/entities/stats/statsAggregatedClip.js';
import { StatsAggregatedItem } from '@orm/entities/stats/statsAggregatedItem.js';
import { StatsAggregatedPlaylist } from '@orm/entities/stats/statsAggregatedPlaylist.js';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid.js';
import { StatsTrackEventAccount } from '@orm/entities/stats/statsTrackEventAccount.js';
import { StatsTrackEventChannel } from '@orm/entities/stats/statsTrackEventChannel.js';
import { StatsTrackEventClip } from '@orm/entities/stats/statsTrackEventClip.js';
import { StatsTrackEventItem } from '@orm/entities/stats/statsTrackEventItem.js';
import { StatsTrackEventPlaylist } from '@orm/entities/stats/statsTrackEventPlaylist.js';

export const entities = [
  Account,
  AccountAppStorePurchase,
  AccountCredentials,
  AccountEmailChangeVerification,
  AccountFCMDevice,
  AccountFollowingAccount,
  AccountFollowingAddByRSSChannel,
  AccountFollowingChannel,
  AccountFollowingPlaylist,
  AccountGooglePlayPurchase,
  AccountMembership,
  AccountMembershipStatus,
  AccountNotificationChannel,
  AccountNotificationChannelType,
  AccountPayPalOrder,
  AccountProfile,
  AccountResetPassword,
  AccountSettings,
  AccountSettingsLocale,
  AccountSettingsNotification,
  AccountSettingsNotificationType,
  AccountUPDevice,
  AccountWebPushDevice,
  AccountVerification,
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
  ChannelSeason,
  ChannelSocialInteract,
  ChannelTrailer,
  ChannelTxt,
  ChannelValue,
  ChannelValueMetaBoost,
  ChannelValueRecipient,
  Clip,
  Feed,
  FeedFlagStatus,
  FeedLog,
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
  ItemValueMetaBoost,
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
  Queue,
  QueueResource,
  SharableStatus,
  StatsAggregatedAccount,
  StatsAggregatedChannel,
  StatsAggregatedClip,
  StatsAggregatedItem,
  StatsAggregatedPlaylist,
  StatsTrackAccountGuid,
  StatsTrackEventAccount,
  StatsTrackEventChannel,
  StatsTrackEventClip,
  StatsTrackEventItem,
  StatsTrackEventPlaylist,
];
