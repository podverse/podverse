### Session 1 - 2026-02-01

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Converted entity relation decorators to string targets and applied `Relation<T>` for single-value relations.
- Switched entity imports to `import type` wherever they are only used for types after decorator changes.
- Verified emitted metadata uses `Object`/`Array` to avoid runtime TDZ references.

#### Files Modified

- packages/orm/src/entities/account/account.ts
- packages/orm/src/entities/account/accountAppStorePurchase.ts
- packages/orm/src/entities/account/accountEmailChangeVerification.ts
- packages/orm/src/entities/account/accountFCMDevice.ts
- packages/orm/src/entities/account/accountFollowingAccount.ts
- packages/orm/src/entities/account/accountFollowingAddByRSSChannel.ts
- packages/orm/src/entities/account/accountFollowingChannel.ts
- packages/orm/src/entities/account/accountFollowingPlaylist.ts
- packages/orm/src/entities/account/accountGooglePlayPurchase.ts
- packages/orm/src/entities/account/accountMembershipStatus.ts
- packages/orm/src/entities/account/accountNotificationChannel.ts
- packages/orm/src/entities/account/accountPayPalOrder.ts
- packages/orm/src/entities/account/accountProfile.ts
- packages/orm/src/entities/account/accountResetPassword.ts
- packages/orm/src/entities/account/accountSettings/accountSettings.ts
- packages/orm/src/entities/account/accountSettings/accountSettingsLocale.ts
- packages/orm/src/entities/account/accountUPDevice.ts
- packages/orm/src/entities/account/accountVerification.ts
- packages/orm/src/entities/account/accountWebPushDevice.ts
- packages/orm/src/entities/category.ts
- packages/orm/src/entities/channel/channelAbout.ts
- packages/orm/src/entities/channel/channelCategory.ts
- packages/orm/src/entities/channel/channelChat.ts
- packages/orm/src/entities/channel/channelDescription.ts
- packages/orm/src/entities/channel/channelFunding.ts
- packages/orm/src/entities/channel/channelImage.ts
- packages/orm/src/entities/channel/channelInternalSettings.ts
- packages/orm/src/entities/channel/channelLicense.ts
- packages/orm/src/entities/channel/channelLocation.ts
- packages/orm/src/entities/channel/channelPerson.ts
- packages/orm/src/entities/channel/channelPodroll.ts
- packages/orm/src/entities/channel/channelPodrollRemoteItem.ts
- packages/orm/src/entities/channel/channelPublisher.ts
- packages/orm/src/entities/channel/channelPublisherRemoteItem.ts
- packages/orm/src/entities/channel/channelRemoteItem.ts
- packages/orm/src/entities/channel/channelSeason.ts
- packages/orm/src/entities/channel/channelSocialInteract.ts
- packages/orm/src/entities/channel/channelTrailer.ts
- packages/orm/src/entities/channel/channelTxt.ts
- packages/orm/src/entities/channel/channelValue.ts
- packages/orm/src/entities/channel/channelValueRecipient.ts
- packages/orm/src/entities/clip.ts
- packages/orm/src/entities/feed/feed.ts
- packages/orm/src/entities/feed/feedFlagStatus.ts
- packages/orm/src/entities/feed/feedLog.ts
- packages/orm/src/entities/item/item.ts
- packages/orm/src/entities/item/itemAbout.ts
- packages/orm/src/entities/item/itemChapter.ts
- packages/orm/src/entities/item/itemChapterLocation.ts
- packages/orm/src/entities/item/itemChaptersFeed.ts
- packages/orm/src/entities/item/itemChaptersFeedLog.ts
- packages/orm/src/entities/item/itemChat.ts
- packages/orm/src/entities/item/itemContentLink.ts
- packages/orm/src/entities/item/itemDescription.ts
- packages/orm/src/entities/item/itemEnclosure.ts
- packages/orm/src/entities/item/itemEnclosureIntegrity.ts
- packages/orm/src/entities/item/itemEnclosureSource.ts
- packages/orm/src/entities/item/itemFlagStatus.ts
- packages/orm/src/entities/item/itemFunding.ts
- packages/orm/src/entities/item/itemImage.ts
- packages/orm/src/entities/item/itemLicense.ts
- packages/orm/src/entities/item/itemLocation.ts
- packages/orm/src/entities/item/itemPerson.ts
- packages/orm/src/entities/item/itemSeason.ts
- packages/orm/src/entities/item/itemSeasonEpisode.ts
- packages/orm/src/entities/item/itemSocialInteract.ts
- packages/orm/src/entities/item/itemSoundbite.ts
- packages/orm/src/entities/item/itemTranscript.ts
- packages/orm/src/entities/item/itemTxt.ts
- packages/orm/src/entities/item/itemValue.ts
- packages/orm/src/entities/item/itemValueRecipient.ts
- packages/orm/src/entities/item/itemValueTimeSplit.ts
- packages/orm/src/entities/item/itemValueTimeSplitRecipient.ts
- packages/orm/src/entities/item/itemValueTimeSplitRemoteItem.ts
- packages/orm/src/entities/liveItem/liveItem.ts
- packages/orm/src/entities/membershipClaimToken.ts
- packages/orm/src/entities/onDemandParserEvent.ts
- packages/orm/src/entities/playlist/playlist.ts
- packages/orm/src/entities/playlist/playlistResource.ts
- packages/orm/src/entities/queue/queue.ts
- packages/orm/src/entities/queue/queueResource.ts
- packages/orm/src/entities/stats/statsAggregatedAccount.ts
- packages/orm/src/entities/stats/statsAggregatedChannel.ts
- packages/orm/src/entities/stats/statsAggregatedClip.ts
- packages/orm/src/entities/stats/statsAggregatedItem.ts
- packages/orm/src/entities/stats/statsAggregatedPlaylist.ts
- packages/orm/src/entities/stats/statsTrackAccountGuid.ts
- packages/orm/src/entities/stats/statsTrackEventAccount.ts
- packages/orm/src/entities/stats/statsTrackEventChannel.ts
- packages/orm/src/entities/stats/statsTrackEventClip.ts
- packages/orm/src/entities/stats/statsTrackEventItem.ts
- packages/orm/src/entities/stats/statsTrackEventPlaylist.ts

### Session 2 - 2026-02-01

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as
you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Used string-based relation targets with type-only imports to avoid ESM runtime cycles.
- Switched management-api inverse relations to string properties to avoid TS18046.
- Added a generic to the notification type relation to keep strong typing.

#### Files Modified

- packages/orm/src/entities/account/accountSettings/accountSettingsNotification.ts
- packages/orm/src/entities/account/accountSettings/accountSettingsNotificationType.ts
- apps/management-api/src/orm/entities/adminAccount.ts
- apps/management-api/src/orm/entities/adminAccountCredentials.ts
- apps/management-api/src/orm/entities/adminAccountRole.ts
