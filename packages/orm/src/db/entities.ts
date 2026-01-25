import { Account } from '@orm/entities/account/account';
import { AccountAppStorePurchase } from '@orm/entities/account/accountAppStorePurchase';
import { AccountCredentials } from '@orm/entities/account/accountCredentials';
import { AccountEmailChangeVerification } from '@orm/entities/account/accountEmailChangeVerification';
import { AccountFCMDevice } from '@orm/entities/account/accountFCMDevice';
import { AccountFollowingAccount } from '@orm/entities/account/accountFollowingAccount';
import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel';
import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel';
import { AccountFollowingPlaylist } from '@orm/entities/account/accountFollowingPlaylist';
import { AccountGooglePlayPurchase } from '@orm/entities/account/accountGooglePlayPurchase';
import { AccountMembership } from '@orm/entities/account/accountMembership';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus';
import { AccountNotificationChannel } from '@orm/entities/account/accountNotificationChannel';
import { AccountNotificationChannelType } from '@orm/entities/account/accountNotificationChannelType';
import { AccountPayPalOrder } from '@orm/entities/account/accountPayPalOrder';
import { AccountProfile } from '@orm/entities/account/accountProfile';
import { AccountResetPassword } from '@orm/entities/account/accountResetPassword';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings';
import { AccountSettingsLocale } from '@orm/entities/account/accountSettings/accountSettingsLocale';
import { AccountSettingsNotification } from '@orm/entities/account/accountSettings/accountSettingsNotification';
import { AccountSettingsNotificationType } from '@orm/entities/account/accountSettings/accountSettingsNotificationType';
import { AccountUPDevice } from '@orm/entities/account/accountUPDevice';
import { AccountWebPushDevice } from '@orm/entities/account/accountWebPushDevice';
import { AccountVerification } from '@orm/entities/account/accountVerification';
import { Category } from '@orm/entities/category';
import { Channel } from '@orm/entities/channel/channel';
import { ChannelAbout } from '@orm/entities/channel/channelAbout';
import { ChannelCategory } from '@orm/entities/channel/channelCategory';
import { ChannelChat } from '@orm/entities/channel/channelChat';
import { ChannelDescription } from '@orm/entities/channel/channelDescription';
import { ChannelFunding } from '@orm/entities/channel/channelFunding';
import { ChannelImage } from '@orm/entities/channel/channelImage';
import { ChannelInternalSettings } from '@orm/entities/channel/channelInternalSettings';
import { ChannelItunesType } from '@orm/entities/channel/channelItunesType';
import { ChannelLicense } from '@orm/entities/channel/channelLicense';
import { ChannelLocation } from '@orm/entities/channel/channelLocation';
import { ChannelPerson } from '@orm/entities/channel/channelPerson';
import { ChannelPodroll } from '@orm/entities/channel/channelPodroll';
import { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher';
import { ChannelPublisherRemoteItem } from '@orm/entities/channel/channelPublisherRemoteItem';
import { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem';
import { ChannelSeason } from '@orm/entities/channel/channelSeason';
import { ChannelSocialInteract } from '@orm/entities/channel/channelSocialInteract';
import { ChannelTrailer } from '@orm/entities/channel/channelTrailer';
import { ChannelTxt } from '@orm/entities/channel/channelTxt';
import { ChannelValue } from '@orm/entities/channel/channelValue';
import { ChannelValueRecipient } from '@orm/entities/channel/channelValueRecipient';
import { Clip } from '@orm/entities/clip';
import { Feed } from '@orm/entities/feed/feed';
import { FeedFlagStatus } from '@orm/entities/feed/feedFlagStatus';
import { FeedLog } from '@orm/entities/feed/feedLog';
import { Item } from '@orm/entities/item/item';
import { ItemAbout } from '@orm/entities/item/itemAbout';
import { ItemChapter } from '@orm/entities/item/itemChapter';
import { ItemChapterLocation } from '@orm/entities/item/itemChapterLocation';
import { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed';
import { ItemChaptersFeedLog } from '@orm/entities/item/itemChaptersFeedLog';
import { ItemChat } from '@orm/entities/item/itemChat';
import { ItemContentLink } from '@orm/entities/item/itemContentLink';
import { ItemDescription } from '@orm/entities/item/itemDescription';
import { ItemEnclosure } from '@orm/entities/item/itemEnclosure';
import { ItemEnclosureIntegrity } from '@orm/entities/item/itemEnclosureIntegrity';
import { ItemEnclosureSource } from '@orm/entities/item/itemEnclosureSource';
import { ItemFlagStatus } from '@orm/entities/item/itemFlagStatus';
import { ItemFunding } from '@orm/entities/item/itemFunding';
import { ItemImage } from '@orm/entities/item/itemImage';
import { ItemItunesEpisodeType } from '@orm/entities/item/itemItunesEpisodeType';
import { ItemLicense } from '@orm/entities/item/itemLicense';
import { ItemLocation } from '@orm/entities/item/itemLocation';
import { ItemPerson } from '@orm/entities/item/itemPerson';
import { ItemSeason } from '@orm/entities/item/itemSeason';
import { ItemSeasonEpisode } from '@orm/entities/item/itemSeasonEpisode';
import { ItemSocialInteract } from '@orm/entities/item/itemSocialInteract';
import { ItemSoundbite } from '@orm/entities/item/itemSoundbite';
import { ItemTranscript } from '@orm/entities/item/itemTranscript';
import { ItemTxt } from '@orm/entities/item/itemTxt';
import { ItemValue } from '@orm/entities/item/itemValue';
import { ItemValueRecipient } from '@orm/entities/item/itemValueRecipient';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit';
import { ItemValueTimeSplitRecipient } from '@orm/entities/item/itemValueTimeSplitRecipient';
import { ItemValueTimeSplitRemoteItem } from '@orm/entities/item/itemValueTimeSplitRemoteItem';
import { LiveItem } from '@orm/entities/liveItem/liveItem';
import { LiveItemStatus } from '@orm/entities/liveItem/liveItemStatus';
import { Medium } from '@orm/entities/medium';
import { MembershipClaimToken } from '@orm/entities/membershipClaimToken';
import { OnDemandParserEvent } from '@orm/entities/onDemandParserEvent';
import { Playlist } from '@orm/entities/playlist/playlist';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource';
import { Queue } from '@orm/entities/queue/queue';
import { QueueResource } from '@orm/entities/queue/queueResource';
import { SharableStatus } from '@orm/entities/sharableStatus';
import { StatsAggregatedAccount } from '@orm/entities/stats/statsAggregatedAccount';
import { StatsAggregatedChannel } from '@orm/entities/stats/statsAggregatedChannel';
import { StatsAggregatedClip } from '@orm/entities/stats/statsAggregatedClip';
import { StatsAggregatedItem } from '@orm/entities/stats/statsAggregatedItem';
import { StatsAggregatedPlaylist } from '@orm/entities/stats/statsAggregatedPlaylist';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid';
import { StatsTrackEventAccount } from '@orm/entities/stats/statsTrackEventAccount';
import { StatsTrackEventChannel } from '@orm/entities/stats/statsTrackEventChannel';
import { StatsTrackEventClip } from '@orm/entities/stats/statsTrackEventClip';
import { StatsTrackEventItem } from '@orm/entities/stats/statsTrackEventItem';
import { StatsTrackEventPlaylist } from '@orm/entities/stats/statsTrackEventPlaylist';

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
  ChannelValueRecipient,
  Clip,
  Feed,
  FeedFlagStatus,
  FeedLog,
  Item,
  ItemAbout,
  ItemChapter,
  ItemChapterLocation,
  ItemChaptersFeed,
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
