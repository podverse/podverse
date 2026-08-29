import type { QueueExtraParams } from '@podverse/helpers';
import type { BetweenParams } from '@podverse/helpers';
import type { MediaTypePreference } from '@podverse/helpers';
import type { QueryParamsPodcastIndexSearchMedium } from '@podverse/helpers';
import type {
  CreateAccountFCMDeviceParams,
  CreateAccountUPDeviceParams,
  CreateAccountWebPushDeviceParams,
  DeleteAccountFCMDeviceParams,
  DeleteAccountUPDeviceParams,
  DeleteAccountWebPushDeviceParams,
  LiveItemStatus,
  PlaylistResourceIdTextOptions,
  UpdateAccountFCMDeviceParams,
  UpdateAccountUPDeviceParams,
  UpdateAccountWebPushDeviceParams,
} from '@podverse/helpers';
import type { AuthContext } from '@podverse/http-request-core';
import { toAuthHeaders } from '@podverse/http-request-core';

import { request } from '../_request.js';
import type { QueryParamsGetManyProfiles } from './account/account.js';
import {
  reqAccountAcceptTerms,
  reqAccountChangeEmailAddress,
  reqAccountCreate,
  reqAccountDelete,
  reqAccountDownloadData,
  reqAccountGetByIdText,
  reqAccountGetMany,
  reqAccountOpmlExport,
  reqAccountOpmlImport,
  reqAccountOpmlImportStatus,
  reqAccountResetPassword,
  reqAccountSendChangeEmailAddressEmail,
  reqAccountSendResetPasswordEmail,
  reqAccountSendVerificationEmail,
  reqAccountUpdate,
  reqAccountVerifyEmail,
} from './account/account.js';
import {
  reqAccountAddByRSSChaptersTranscript,
  type ReqAccountAddByRSSChaptersTranscriptParams,
} from './account/addByRSSChaptersTranscript.js';
import {
  reqAccountFCMDeviceCreate,
  reqAccountFCMDeviceDelete,
  reqAccountFCMDeviceGetAllForAccount,
  reqAccountFCMDeviceUpdate,
  reqAccountFCMDeviceUpdateLocale,
} from './account/fcm/fcm.js';
import { reqAccountFollowAccount, reqAccountUnfollowAccount } from './account/follow/account.js';
import {
  reqAccountFollowAddByRSSChannel,
  reqAccountGetFollowedAddByRSSChannels,
  reqAccountUnfollowAddByRSSChannel,
} from './account/follow/addByRSSChannel.js';
import { reqAccountFollowChannel, reqAccountUnfollowChannel } from './account/follow/channel.js';
import { reqAccountFollowPlaylist, reqAccountUnfollowPlaylist } from './account/follow/playlist.js';
import {
  reqAccountNotificationChannelCreate,
  reqAccountNotificationChannelDelete,
} from './account/notification/channel.js';
import {
  reqAccountNotificationChannelTypeCreate,
  reqAccountNotificationChannelTypeDelete,
} from './account/notification/channelType.js';
import {
  reqNotificationPreferencesGet,
  reqNotificationPreferencesUpdate,
  type ReqNotificationPreferenceUpdateInput,
  reqNotificationsList,
  type ReqNotificationsListResponse,
  reqNotificationsMarkSeen,
  reqNotificationsUnseenCount,
} from './account/notification/notifications.js';
import {
  reqAccountUPDeviceCreate,
  reqAccountUPDeviceDelete,
  reqAccountUPDeviceDeleteAll,
  reqAccountUPDeviceGetForAccount,
  reqAccountUPDeviceUpdate,
  reqAccountUPDeviceUpdateLocale,
} from './account/unifiedpush/unifiedpush.js';
import {
  reqAccountWebPushDeviceCreate,
  reqAccountWebPushDeviceDelete,
  reqAccountWebPushDeviceGetAllForAccount,
  reqAccountWebPushDeviceUpdate,
} from './account/webpush/webpush.js';
import {
  reqAccountSettingsListenStatsUpdate,
  reqAccountSettingsLocaleUpdate,
  reqAccountSettingsNotificationTypeCreate,
  reqAccountSettingsNotificationTypeDelete,
  reqAccountSettingsPlaybackUpdate,
} from './accountSettings/accountSettings.js';
import {
  reqAuthCheckSession,
  reqAuthLogin,
  reqAuthLogout,
  reqAuthMe,
  reqAuthMobileRefresh,
  reqAuthMobileRevoke,
  reqAuthMobileToken,
} from './auth/auth.js';
import { reqCategoryGetAll } from './category/category.js';
import {
  reqChannelGetByIdOrIdText,
  reqChannelGetByPodcastIndexId,
  reqChannelGetMany,
} from './channel/channel.js';
import type { ReqClipCreateParams } from './clip/clip.js';
import {
  reqClipCreate,
  reqClipDelete,
  reqClipGet,
  reqClipGetManyByChannelPublic,
  reqClipGetManyByItemPublic,
  reqClipGetManyPublic,
  reqClipUpdate,
} from './clip/clip.js';
import { reqEmbedDemoGetShowcase } from './embedDemo/embedDemo.js';
import {
  reqPodcastIndexFeedById,
  reqPodcastIndexSearchPodcasts,
} from './externalServices/podcastIndex/index.js';
import { reqFeedGetByPodcastIndexId } from './feed/feed.js';
import {
  reqItemGetByIdOrIdText,
  reqItemGetMany,
  reqItemGetManyByChannel,
  reqItemGetManyByChannelBySeason,
  reqItemGetManyByChannelShuffle,
  reqItemGetManyForQueueByPubDate,
  reqItemGetManyForQueueBySeason,
  reqItemParseAndGetChapters,
} from './item/item.js';
import { reqItemChapterGetByIdText } from './itemChapter/itemChapter.js';
import {
  reqItemSoundbiteGet,
  reqItemSoundbiteGetManyByChannelIdText,
  reqItemSoundbiteGetManyByItemIdText,
} from './itemSoundbite/itemSoundbite.js';
import { reqItemTranscriptGet } from './itemTranscript/itemTranscript.js';
import { reqLiveItemGetMany, reqLiveItemGetManyByChannel } from './liveItem/liveItem.js';
import { reqMembershipGetPricing } from './membership/membership.js';
import {
  reqMetaboostMbrssV1MintAppAssertion,
  type ReqMetaboostMbrssV1MintAppAssertionParams,
  reqMetaboostMbrssV1MintRateLimitStatus,
} from './metaboost/mbrssV1AppAssertion.js';
import { reqMQRSSAddOnDemand, reqMQRSSRefreshOnDemand } from './mq/mq.js';
import type {
  ReqPlaylistCreateParams,
  ReqPlaylistEditParams,
  ReqPlaylistGetAllLikesPrivateParams,
  ReqPlaylistLikesMembershipParams,
  ReqPlaylistToggleLikeParams,
} from './playlist/playlist.js';
import {
  reqPlaylistCreate,
  reqPlaylistDelete,
  reqPlaylistEdit,
  reqPlaylistGet,
  reqPlaylistGetAllLikesPrivate,
  reqPlaylistGetMany,
  reqPlaylistLikesMembership,
  reqPlaylistToggleLike,
} from './playlist/playlist.js';
import {
  reqPlaylistResourceGetAllByPlaylistIdTextPrivate,
  reqPlaylistResourceGetManyByPlaylistIdText,
  reqPlaylistResourceGetManyByShuffle,
  reqPlaylistResourceGetManyForQueueByListPosition,
} from './playlist/playlistResource/playlistResource.js';
import {
  reqPlaylistResourceClipAddBetween,
  reqPlaylistResourceClipAddFirst,
  reqPlaylistResourceClipAddLast,
  reqPlaylistResourceClipDelete,
} from './playlist/playlistResource/playlistResourceClip.js';
import {
  reqPlaylistResourceItemAddBetween,
  reqPlaylistResourceItemAddFirst,
  reqPlaylistResourceItemAddLast,
  reqPlaylistResourceItemDelete,
} from './playlist/playlistResource/playlistResourceItem.js';
import {
  reqPlaylistResourceItemAddByRSSAddBetween,
  reqPlaylistResourceItemAddByRSSAddFirst,
  reqPlaylistResourceItemAddByRSSAddLast,
  reqPlaylistResourceItemAddByRSSDelete,
} from './playlist/playlistResource/playlistResourceItemAddByRSS.js';
import {
  reqPlaylistResourceItemSoundbiteAddBetween,
  reqPlaylistResourceItemSoundbiteAddFirst,
  reqPlaylistResourceItemSoundbiteAddLast,
  reqPlaylistResourceItemSoundbiteDelete,
} from './playlist/playlistResource/playlistResourceItemSoundbite.js';
import { reqPodrollGetForChannel } from './podroll/podroll.js';
import type { QueryParamsProfileContent } from './profile/profile.js';
import {
  reqMyProfileAlbumsAZ,
  reqMyProfileClipsRecent,
  reqMyProfilePlaylistsAZ,
  reqMyProfilePodcastsAZ,
  reqProfileAlbumsAZ,
  reqProfileClipsRecent,
  reqProfilePlaylistsAZ,
  reqProfilePodcastsAZ,
} from './profile/profile.js';
import { reqPublisherFeedGetRemoteItemsForChannel } from './publisherFeed/publisherFeed.js';
import type {
  QueryDirection,
  QueryParamsGetMany,
  QueryParamsGetManyPartial,
  QueryParamsIndividualList,
  QueryParamsIndividualListMusic,
  QueryParamsItemSoundbitesByChannel,
  QueryParamsItemSoundbitesByItem,
  QueryParamsPlaylistResources,
  QueryParamsPlaylists,
  QueryParamsShuffle,
} from './queryParams.js';
import { reqQueueGetAllForAccountPrivate, reqQueueUpdateIsActiveQueue } from './queue/queue.js';
import {
  reqQueueResourcesGetAllByAccountAbridged,
  reqQueueResourcesGetAllUpcomingByQueueIdText,
  reqQueueResourcesGetHistoryByQueueIdTextPaginated,
  reqQueueResourcesGetNowPlayingByQueueIdText,
} from './queue/queueResource/queueResource.js';
import {
  reqQueueResourceClipAddBetween,
  reqQueueResourceClipAddHistory,
  reqQueueResourceClipAddLast,
  reqQueueResourceClipAddNext,
  reqQueueResourceClipAddNowPlaying,
  reqQueueResourceClipDelete,
} from './queue/queueResource/queueResourceClip.js';
import {
  reqQueueResourceItemAddBetween,
  reqQueueResourceItemAddHistory,
  reqQueueResourceItemAddLast,
  reqQueueResourceItemAddNext,
  reqQueueResourceItemAddNowPlaying,
  reqQueueResourceItemDelete,
} from './queue/queueResource/queueResourceItem.js';
import {
  reqQueueResourceItemAddByRSSAddBetween,
  reqQueueResourceItemAddByRSSAddHistory,
  reqQueueResourceItemAddByRSSAddLast,
  reqQueueResourceItemAddByRSSAddNext,
  reqQueueResourceItemAddByRSSAddNowPlaying,
  reqQueueResourceItemAddByRSSDelete,
} from './queue/queueResource/queueResourceItemAddByRSS.js';
import {
  reqQueueResourceItemSoundbiteAddBetween,
  reqQueueResourceItemSoundbiteAddHistory,
  reqQueueResourceItemSoundbiteAddLast,
  reqQueueResourceItemSoundbiteAddNext,
  reqQueueResourceItemSoundbiteAddNowPlaying,
  reqQueueResourceItemSoundbiteDelete,
} from './queue/queueResource/queueResourceItemSoundbite.js';
import { shouldSkipApiRequestErrorLog } from './shouldSkipApiRequestErrorLog.js';
import {
  reqStatsTrackAccount,
  reqStatsTrackChannel,
  reqStatsTrackClip,
  reqStatsTrackItem,
  reqStatsTrackPlaylist,
} from './stats/stats.js';

export type {
  AddByRSSChapterResponse,
  ReqAccountAddByRSSChaptersTranscriptParams,
} from './account/addByRSSChaptersTranscript.js';

export type AbortOpts = { controller: AbortController; timeoutMs: number };

export interface ApiRequestParams {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  config?: Record<string, unknown>;
  abort?: AbortOpts;
  userAgent?: string;
  jwt?: string;
}

export class ApiRequestService {
  private apiBase: string;
  private authContext?: AuthContext;
  private defaultHeaders?: Record<string, string>;

  constructor(params: {
    protocol: string;
    host: string;
    port?: string | number;
    prefix: string;
    version: string;
    jwt?: string;
    authContext?: AuthContext;
    /**
     * Headers applied to every request from this service (e.g. a mobile client-version header).
     * Per-request `config.headers` and auth headers take precedence over these.
     */
    defaultHeaders?: Record<string, string>;
  }) {
    const { protocol, host, port, prefix, version, jwt, authContext, defaultHeaders } = params;
    const portPart = port ? `:${port}` : '';
    this.apiBase = `${protocol}://${host}${portPart}${prefix.replace(/\/$/, '')}${version}`;
    this.authContext =
      authContext ?? (jwt ? { mode: 'cookie', cookieName: 'jwt', token: jwt } : undefined);
    this.defaultHeaders = defaultHeaders;
  }

  async apiRequest<T>({
    path,
    method = 'GET',
    data,
    config = {},
    abort,
    userAgent,
  }: ApiRequestParams): Promise<T> {
    // Store responseType for error handling
    const responseType = (config as { responseType?: string })?.responseType;

    try {
      const mergedConfig = {
        ...config,
        ...(userAgent ? { userAgent } : {}),
        headers: {
          ...(this.defaultHeaders ?? {}),
          ...((config.headers as Record<string, string> | undefined) ?? {}),
          ...toAuthHeaders(this.authContext),
        },
      };

      const options =
        method === 'GET' ? { method, ...mergedConfig } : { method, data, ...mergedConfig };

      const response = await request<T>(`${this.apiBase}${path}`, options, abort);
      return response.data;
    } catch (error: unknown) {
      // Extract useful debugging information from the error
      const errorInfo: {
        message?: string;
        status?: number;
        url?: string;
        method?: string;
        responseData?: unknown;
      } = {};

      // Type guard for error with response property (AxiosError)
      const isAxiosError = (
        err: unknown
      ): err is {
        response?: { status: number; data?: unknown };
        config?: { url?: string; method?: string; responseType?: string };
        request?: unknown;
        message?: string;
      } => {
        return typeof err === 'object' && err !== null;
      };

      if (isAxiosError(error)) {
        if (error.response) {
          // Axios response error
          errorInfo.status = error.response.status;
          errorInfo.url = error.config?.url ?? `${this.apiBase}${path}`;
          if (error.config?.method) {
            errorInfo.method = error.config.method.toUpperCase();
          }

          // If responseType is 'blob' and we have an error response, convert blob to JSON
          if (responseType === 'blob' && error.response.data instanceof Blob) {
            try {
              const blobText = await (error.response.data as Blob).text();
              const parsedData = JSON.parse(blobText);
              // Replace the blob with parsed JSON in the error object
              error.response.data = parsedData;
              errorInfo.responseData = parsedData;
            } catch {
              // If parsing fails, keep the blob but log the error
              errorInfo.responseData = error.response.data;
            }
          } else {
            errorInfo.responseData = error.response.data;
          }

          const responseData = error.response.data as { message?: string } | undefined;
          errorInfo.message = responseData?.message || error.message || 'Request failed';
        } else if (error.request) {
          // Request was made but no response received
          errorInfo.message = error.message ?? 'No response received from server';
          errorInfo.url = error.config?.url ?? `${this.apiBase}${path}`;
          if (error.config?.method) {
            errorInfo.method = error.config.method.toUpperCase();
          }
        } else {
          // Error setting up the request
          errorInfo.message = error.message || 'Error setting up request';
        }
      } else if (error instanceof Error) {
        errorInfo.message = error.message;
      } else {
        errorInfo.message = 'Unknown error occurred';
      }

      if (!shouldSkipApiRequestErrorLog(errorInfo, path)) {
        console.error('API request error:', {
          ...errorInfo,
          path: `${method} ${path}`,
        });
      }

      throw error;
    }
  }

  /* ACCOUNT */

  reqAccountGetMany(params: QueryParamsGetManyProfiles) {
    return reqAccountGetMany(this, params);
  }

  reqAccountGetByIdText(params: { id_text: string }) {
    return reqAccountGetByIdText(this, params);
  }

  reqAccountCreate(params: {
    email: string;
    password: string;
    locale: string;
    terms_version: string;
    allow_listen_stats?: boolean;
  }) {
    return reqAccountCreate(this, params);
  }

  reqAccountAcceptTerms(params: { terms_version: string }) {
    return reqAccountAcceptTerms(this, params);
  }

  reqAccountSendVerificationEmail(params: { email: string }) {
    return reqAccountSendVerificationEmail(this, params);
  }

  reqAccountVerifyEmail(params: { token: string }) {
    return reqAccountVerifyEmail(this, params);
  }

  reqAccountSendResetPasswordEmail(params: { email: string }) {
    return reqAccountSendResetPasswordEmail(this, params);
  }

  reqAccountResetPassword(params: { token: string; password: string }) {
    return reqAccountResetPassword(this, params);
  }

  reqAccountSendChangeEmailAddressEmail(params: { new_email: string }) {
    return reqAccountSendChangeEmailAddressEmail(this, params);
  }

  reqAccountChangeEmailAddress(params: { token: string }) {
    return reqAccountChangeEmailAddress(this, params);
  }

  reqAccountUpdate(params: {
    display_name: string | null;
    bio: string | null;
    sharable_status: number;
    locale: string;
  }) {
    return reqAccountUpdate(this, params);
  }

  reqAccountDelete() {
    return reqAccountDelete(this);
  }

  reqAccountDownloadData() {
    return reqAccountDownloadData(this);
  }

  reqAccountOpmlExport(options?: { responseType?: 'blob' | 'text' }) {
    return reqAccountOpmlExport(this, options);
  }

  reqAccountOpmlImport(params: { opml: string }) {
    return reqAccountOpmlImport(this, params);
  }

  reqAccountOpmlImportStatus(requestId: string) {
    return reqAccountOpmlImportStatus(this, requestId);
  }

  /* ACCOUNT > FCM DEVICE */

  reqAccountFCMDeviceCreate(params: CreateAccountFCMDeviceParams) {
    return reqAccountFCMDeviceCreate(this, params);
  }

  reqAccountFCMDeviceUpdate(params: UpdateAccountFCMDeviceParams) {
    return reqAccountFCMDeviceUpdate(this, params);
  }

  reqAccountFCMDeviceDelete(params: DeleteAccountFCMDeviceParams) {
    return reqAccountFCMDeviceDelete(this, params);
  }

  reqAccountFCMDeviceGetAllForAccount() {
    return reqAccountFCMDeviceGetAllForAccount(this);
  }

  reqAccountFCMDeviceUpdateLocale(params: { locale: string }) {
    return reqAccountFCMDeviceUpdateLocale(this, params);
  }

  /* ACCOUNT > WEBPUSH DEVICE */

  reqAccountWebPushDeviceCreate(params: CreateAccountWebPushDeviceParams) {
    return reqAccountWebPushDeviceCreate(this, params);
  }

  reqAccountWebPushDeviceUpdate(params: UpdateAccountWebPushDeviceParams) {
    return reqAccountWebPushDeviceUpdate(this, params);
  }

  reqAccountWebPushDeviceDelete(params: DeleteAccountWebPushDeviceParams) {
    return reqAccountWebPushDeviceDelete(this, params);
  }

  reqAccountWebPushDeviceGetAllForAccount() {
    return reqAccountWebPushDeviceGetAllForAccount(this);
  }

  /* ACCOUNT > UNIFIED PUSH DEVICE */

  reqAccountUPDeviceCreate(params: CreateAccountUPDeviceParams) {
    return reqAccountUPDeviceCreate(this, params);
  }

  reqAccountUPDeviceUpdate(params: UpdateAccountUPDeviceParams) {
    return reqAccountUPDeviceUpdate(this, params);
  }

  reqAccountUPDeviceDelete(params: DeleteAccountUPDeviceParams) {
    return reqAccountUPDeviceDelete(this, params);
  }

  reqAccountUPDeviceGetForAccount() {
    return reqAccountUPDeviceGetForAccount(this);
  }

  reqAccountUPDeviceUpdateLocale(params: { locale: string }) {
    return reqAccountUPDeviceUpdateLocale(this, params);
  }

  reqAccountUPDeviceDeleteAll() {
    return reqAccountUPDeviceDeleteAll(this);
  }

  /* ACCOUNT > FOLLOW > CHANNEL */

  reqAccountFollowChannel(params: { channel_id_text: string }) {
    return reqAccountFollowChannel(this, params);
  }

  reqAccountUnfollowChannel(params: { channel_id_text: string }) {
    return reqAccountUnfollowChannel(this, params);
  }

  /* ACCOUNT > FOLLOW > ADD BY RSS CHANNEL */

  reqAccountFollowAddByRSSChannel(params: {
    feed_url: string;
    title?: string | null;
    image_url?: string | null;
    basic_auth_username?: string | null;
    basic_auth_password?: string | null;
  }) {
    return reqAccountFollowAddByRSSChannel(this, params);
  }

  reqAccountUnfollowAddByRSSChannel(params: { feed_url: string }) {
    return reqAccountUnfollowAddByRSSChannel(this, params);
  }

  reqAccountGetFollowedAddByRSSChannels(params: { account_id_text: string }) {
    return reqAccountGetFollowedAddByRSSChannels(this, params);
  }

  reqAccountAddByRSSChaptersTranscript(params: ReqAccountAddByRSSChaptersTranscriptParams) {
    return reqAccountAddByRSSChaptersTranscript(this, params);
  }

  /* ACCOUNT > FOLLOW > ACCOUNT */

  reqAccountFollowAccount(params: { following_account_id_text: string }) {
    return reqAccountFollowAccount(this, params);
  }

  reqAccountUnfollowAccount(params: { following_account_id_text: string }) {
    return reqAccountUnfollowAccount(this, params);
  }

  /* ACCOUNT > FOLLOW > PLAYLIST */

  reqAccountFollowPlaylist(params: { playlist_id_text: string }) {
    return reqAccountFollowPlaylist(this, params);
  }

  reqAccountUnfollowPlaylist(params: { playlist_id_text: string }) {
    return reqAccountUnfollowPlaylist(this, params);
  }

  /* ACCOUNT > NOTIFICATION > CHANNEL */

  reqAccountNotificationChannelCreate(params: { channel_id_text: string }) {
    return reqAccountNotificationChannelCreate(this, params);
  }

  reqAccountNotificationChannelDelete(params: { channel_id_text: string }) {
    return reqAccountNotificationChannelDelete(this, params);
  }

  /* ACCOUNT > NOTIFICATION > CHANNEL TYPE */

  reqAccountNotificationChannelTypeCreate(params: { channel_id_text: string; type: string }) {
    return reqAccountNotificationChannelTypeCreate(this, params);
  }

  reqAccountNotificationChannelTypeDelete(params: { channel_id_text: string; type: string }) {
    return reqAccountNotificationChannelTypeDelete(this, params);
  }

  reqNotificationsList(params?: {
    page?: number;
    limit?: number;
  }): Promise<ReqNotificationsListResponse> {
    return reqNotificationsList(this, params);
  }

  reqNotificationsUnseenCount(): Promise<{ unseen_count: number }> {
    return reqNotificationsUnseenCount(this);
  }

  reqNotificationsMarkSeen(): Promise<{ last_seen_at: string }> {
    return reqNotificationsMarkSeen(this);
  }

  reqNotificationPreferencesGet() {
    return reqNotificationPreferencesGet(this);
  }

  reqNotificationPreferencesUpdate(params: {
    preferences: ReqNotificationPreferenceUpdateInput[];
  }) {
    return reqNotificationPreferencesUpdate(this, params);
  }

  /* ACCOUNT > SETTINGS > LOCALE */

  reqAccountSettingsLocaleUpdate(params: { locale: string }) {
    return reqAccountSettingsLocaleUpdate(this, params);
  }

  reqAccountSettingsListenStatsUpdate(params: { allow_listen_stats: boolean }) {
    return reqAccountSettingsListenStatsUpdate(this, params);
  }

  reqAccountSettingsPlaybackUpdate(params: { preferred_media_type: MediaTypePreference }) {
    return reqAccountSettingsPlaybackUpdate(this, params);
  }

  /* ACCOUNT > SETTINGS > NOTIFICATIONS */

  reqAccountSettingsNotificationTypeCreate(params: { type: string }) {
    return reqAccountSettingsNotificationTypeCreate(this, params);
  }

  reqAccountSettingsNotificationTypeDelete(params: { type: string }) {
    return reqAccountSettingsNotificationTypeDelete(this, params);
  }

  /* AUTH */

  reqAuthLogin(params: { email: string; password: string; includeTokenInResponseBody?: boolean }) {
    return reqAuthLogin(this, params);
  }

  reqAuthLogout() {
    return reqAuthLogout(this);
  }

  reqAuthMe() {
    return reqAuthMe(this);
  }

  reqAuthCheckSession() {
    return reqAuthCheckSession(this);
  }

  reqAuthMobileToken(params: { email: string; password: string }) {
    return reqAuthMobileToken(this, params);
  }

  reqAuthMobileRefresh(refresh_token: string) {
    return reqAuthMobileRefresh(this, refresh_token);
  }

  reqAuthMobileRevoke(refresh_token: string) {
    return reqAuthMobileRevoke(this, refresh_token);
  }

  /* CATEGORY */

  reqCategoryGetAll() {
    return reqCategoryGetAll(this);
  }

  /* CHANNEL */

  reqChannelGetByIdOrIdText(idOrIdText: number | string) {
    return reqChannelGetByIdOrIdText(this, idOrIdText);
  }

  reqChannelGetByPodcastIndexId(podcast_index_id: number | string) {
    return reqChannelGetByPodcastIndexId(this, podcast_index_id);
  }

  reqChannelGetMany(params: QueryParamsGetMany) {
    return reqChannelGetMany(this, params);
  }

  /* CLIP */

  reqClipCreate(params: ReqClipCreateParams) {
    return reqClipCreate(this, params);
  }

  reqClipUpdate(clip_id_text: string, params: ReqClipCreateParams) {
    return reqClipUpdate(this, clip_id_text, params);
  }

  reqClipDelete(clip_id_text: string) {
    return reqClipDelete(this, clip_id_text);
  }

  reqClipGet(clip_id_text: string) {
    return reqClipGet(this, clip_id_text);
  }

  reqClipGetManyPublic(params: QueryParamsGetManyPartial) {
    return reqClipGetManyPublic(this, params);
  }

  reqClipGetManyByChannelPublic(params: QueryParamsIndividualList) {
    return reqClipGetManyByChannelPublic(this, params);
  }

  reqClipGetManyByItemPublic(params: QueryParamsIndividualList) {
    return reqClipGetManyByItemPublic(this, params);
  }

  /* EXTERNAL SERVICES > PODCAST INDEX */

  reqPodcastIndexFeedById(podcast_index_id: string) {
    return reqPodcastIndexFeedById(this, podcast_index_id);
  }

  reqPodcastIndexSearchPodcasts(options: {
    q: string;
    medium?: QueryParamsPodcastIndexSearchMedium;
  }) {
    return reqPodcastIndexSearchPodcasts(this, options);
  }

  /* EMBED DEMO */

  reqEmbedDemoGetShowcase() {
    return reqEmbedDemoGetShowcase(this);
  }

  /* FEED */

  reqFeedGetByPodcastIndexId(podcast_index_id: number | string) {
    return reqFeedGetByPodcastIndexId(this, podcast_index_id);
  }

  /* ITEM */

  reqItemGetByIdOrIdText(idOrIdText: string) {
    return reqItemGetByIdOrIdText(this, idOrIdText);
  }

  reqItemGetMany(params: QueryParamsGetManyPartial) {
    return reqItemGetMany(this, params);
  }

  reqItemGetManyByChannel(params: QueryParamsIndividualList) {
    return reqItemGetManyByChannel(this, params);
  }

  reqItemGetManyByChannelBySeason(params: QueryParamsIndividualListMusic) {
    return reqItemGetManyByChannelBySeason(this, params);
  }

  reqItemGetManyByChannelShuffle(idText: string, params: QueryParamsShuffle) {
    return reqItemGetManyByChannelShuffle(this, idText, params);
  }

  reqItemGetManyForQueueByPubDate(idText: string, direction: QueryDirection) {
    return reqItemGetManyForQueueByPubDate(this, idText, direction);
  }

  reqItemGetManyForQueueBySeason(idText: string, direction: QueryDirection) {
    return reqItemGetManyForQueueBySeason(this, idText, direction);
  }

  /* ITEM CHAPTER */

  reqItemParseAndGetChapters(item_id_text: string) {
    return reqItemParseAndGetChapters(this, item_id_text);
  }

  reqItemChapterGetByIdText(item_chapter_id_text: string) {
    return reqItemChapterGetByIdText(this, item_chapter_id_text);
  }

  /* ITEM SOUNDBITE */

  reqItemSoundbiteGet(item_soundbite_id_text: string) {
    return reqItemSoundbiteGet(this, item_soundbite_id_text);
  }

  reqItemSoundbiteGetManyByChannelIdText(
    channel_id_text: string,
    params: QueryParamsItemSoundbitesByChannel
  ) {
    return reqItemSoundbiteGetManyByChannelIdText(this, channel_id_text, params);
  }

  reqItemSoundbiteGetManyByItemIdText(
    item_id_text: string,
    params: QueryParamsItemSoundbitesByItem
  ) {
    return reqItemSoundbiteGetManyByItemIdText(this, item_id_text, params);
  }

  /* ITEM TRANSCRIPT */

  reqItemTranscriptGet(item_transcript_id_text: string) {
    return reqItemTranscriptGet(this, item_transcript_id_text);
  }

  /* LIVE ITEM */

  reqLiveItemGetMany(params: QueryParamsGetManyPartial, liveItemType: LiveItemStatus) {
    return reqLiveItemGetMany(this, params, liveItemType);
  }

  reqLiveItemGetManyByChannel(channelIdOrIdText: string) {
    return reqLiveItemGetManyByChannel(this, channelIdOrIdText);
  }

  /* MEMBERSHIP */

  reqMembershipGetPricing() {
    return reqMembershipGetPricing(this);
  }

  /* METABOOST */

  reqMetaboostMbrssV1MintRateLimitStatus() {
    return reqMetaboostMbrssV1MintRateLimitStatus(this);
  }

  reqMetaboostMbrssV1MintAppAssertion(params: ReqMetaboostMbrssV1MintAppAssertionParams) {
    return reqMetaboostMbrssV1MintAppAssertion(this, params);
  }

  /* MQ */

  reqMQRSSAddOnDemand(params: { url: string; podcast_index_id: number }) {
    return reqMQRSSAddOnDemand(this, params);
  }

  reqMQRSSRefreshOnDemand(params: { url: string; podcast_index_id: number }) {
    return reqMQRSSRefreshOnDemand(this, params);
  }

  /* PLAYLIST */

  reqPlaylistGet(id_text: string) {
    return reqPlaylistGet(this, id_text);
  }

  reqPlaylistGetMany(params: QueryParamsPlaylists) {
    return reqPlaylistGetMany(this, params);
  }

  reqPlaylistGetAllLikesPrivate(params?: ReqPlaylistGetAllLikesPrivateParams) {
    return reqPlaylistGetAllLikesPrivate(this, params);
  }

  reqPlaylistLikesMembership(params: ReqPlaylistLikesMembershipParams) {
    return reqPlaylistLikesMembership(this, params);
  }

  reqPlaylistToggleLike(params: ReqPlaylistToggleLikeParams) {
    return reqPlaylistToggleLike(this, params);
  }

  reqPlaylistCreate(params: ReqPlaylistCreateParams) {
    return reqPlaylistCreate(this, params);
  }

  reqPlaylistEdit(params: ReqPlaylistEditParams) {
    return reqPlaylistEdit(this, params);
  }

  reqPlaylistDelete(id_text: string) {
    return reqPlaylistDelete(this, id_text);
  }

  /* PLAYLIST RESOURCE */

  reqPlaylistResourceGetAllByPlaylistIdTextPrivate(playlist_id_text: string) {
    return reqPlaylistResourceGetAllByPlaylistIdTextPrivate(this, playlist_id_text);
  }

  reqPlaylistResourceGetManyByPlaylistIdText(
    playlist_id_text: string,
    params: QueryParamsPlaylistResources
  ) {
    return reqPlaylistResourceGetManyByPlaylistIdText(this, playlist_id_text, params);
  }

  reqPlaylistResourceGetManyForQueueByListPosition(
    playlist_id_text: string,
    idTextOptions: PlaylistResourceIdTextOptions,
    direction: 'forward' | 'backward'
  ) {
    return reqPlaylistResourceGetManyForQueueByListPosition(
      this,
      playlist_id_text,
      idTextOptions,
      direction
    );
  }

  reqPlaylistResourceGetManyByShuffle(playlist_id_text: string, shuffleHash: string, page: number) {
    return reqPlaylistResourceGetManyByShuffle(this, playlist_id_text, shuffleHash, page);
  }

  /* PLAYLIST RESOURCE > CLIP */

  reqPlaylistResourceClipAddFirst(playlist_id_text: string, clip_id_text: string) {
    return reqPlaylistResourceClipAddFirst(this, playlist_id_text, clip_id_text);
  }

  reqPlaylistResourceClipAddBetween(
    playlist_id_text: string,
    clip_id_text: string,
    params: BetweenParams
  ) {
    return reqPlaylistResourceClipAddBetween(this, playlist_id_text, clip_id_text, params);
  }

  reqPlaylistResourceClipAddLast(playlist_id_text: string, clip_id_text: string) {
    return reqPlaylistResourceClipAddLast(this, playlist_id_text, clip_id_text);
  }

  reqPlaylistResourceClipDelete(playlist_id_text: string, clip_id_text: string) {
    return reqPlaylistResourceClipDelete(this, playlist_id_text, clip_id_text);
  }

  /* PLAYLIST RESOURCE > ITEM */

  reqPlaylistResourceItemAddFirst(playlist_id_text: string, item_id_text: string) {
    return reqPlaylistResourceItemAddFirst(this, playlist_id_text, item_id_text);
  }

  reqPlaylistResourceItemAddBetween(
    playlist_id_text: string,
    item_id_text: string,
    params: BetweenParams
  ) {
    return reqPlaylistResourceItemAddBetween(this, playlist_id_text, item_id_text, params);
  }

  reqPlaylistResourceItemAddLast(playlist_id_text: string, item_id_text: string) {
    return reqPlaylistResourceItemAddLast(this, playlist_id_text, item_id_text);
  }

  reqPlaylistResourceItemDelete(playlist_id_text: string, item_id_text: string) {
    return reqPlaylistResourceItemDelete(this, playlist_id_text, item_id_text);
  }

  reqPlaylistResourceItemAddByRSSAddFirst(
    playlist_id_text: string,
    params: { add_by_rss_resource_data: object }
  ) {
    return reqPlaylistResourceItemAddByRSSAddFirst(this, playlist_id_text, params);
  }

  reqPlaylistResourceItemAddByRSSAddLast(
    playlist_id_text: string,
    params: { add_by_rss_resource_data: object }
  ) {
    return reqPlaylistResourceItemAddByRSSAddLast(this, playlist_id_text, params);
  }

  reqPlaylistResourceItemAddByRSSAddBetween(
    playlist_id_text: string,
    params: BetweenParams & { add_by_rss_resource_data: object }
  ) {
    return reqPlaylistResourceItemAddByRSSAddBetween(this, playlist_id_text, params);
  }

  reqPlaylistResourceItemAddByRSSDelete(playlist_id_text: string, add_by_rss_hash_id: string) {
    return reqPlaylistResourceItemAddByRSSDelete(this, playlist_id_text, add_by_rss_hash_id);
  }

  /* PLAYLIST RESOURCE > ITEM SOUNDBITE */

  reqPlaylistResourceItemSoundbiteAddFirst(
    playlist_id_text: string,
    item_soundbite_id_text: string
  ) {
    return reqPlaylistResourceItemSoundbiteAddFirst(this, playlist_id_text, item_soundbite_id_text);
  }

  reqPlaylistResourceItemSoundbiteAddBetween(
    playlist_id_text: string,
    item_soundbite_id_text: string,
    params: BetweenParams
  ) {
    return reqPlaylistResourceItemSoundbiteAddBetween(
      this,
      playlist_id_text,
      item_soundbite_id_text,
      params
    );
  }

  reqPlaylistResourceItemSoundbiteAddLast(
    playlist_id_text: string,
    item_soundbite_id_text: string
  ) {
    return reqPlaylistResourceItemSoundbiteAddLast(this, playlist_id_text, item_soundbite_id_text);
  }

  reqPlaylistResourceItemSoundbiteDelete(playlist_id_text: string, item_soundbite_id_text: string) {
    return reqPlaylistResourceItemSoundbiteDelete(this, playlist_id_text, item_soundbite_id_text);
  }

  /* PODROLL */

  reqPodrollGetForChannel(idOrIdText: string) {
    return reqPodrollGetForChannel(this, idOrIdText);
  }

  /* PUBLISHER FEED */

  reqPublisherFeedGetRemoteItemsForChannel(idOrIdText: string) {
    return reqPublisherFeedGetRemoteItemsForChannel(this, idOrIdText);
  }

  /* QUEUE */

  reqQueueGetAllForAccountPrivate() {
    return reqQueueGetAllForAccountPrivate(this);
  }

  reqQueueUpdateIsActiveQueue(queue_id_text: string, is_active_queue: boolean) {
    return reqQueueUpdateIsActiveQueue(this, { queue_id_text, is_active_queue });
  }

  /* QUEUE RESOURCE */

  reqQueueResourcesGetNowPlayingByQueueIdText(queue_id_text: string) {
    return reqQueueResourcesGetNowPlayingByQueueIdText(this, { queue_id_text });
  }

  reqQueueResourcesGetAllUpcomingByQueueIdText(queue_id_text: string) {
    return reqQueueResourcesGetAllUpcomingByQueueIdText(this, { queue_id_text });
  }

  reqQueueResourcesGetHistoryByQueueIdTextPaginated(queue_id_text: string, page?: number) {
    return reqQueueResourcesGetHistoryByQueueIdTextPaginated(this, {
      queue_id_text,
      ...(page !== undefined ? { page } : {}),
    });
  }

  reqQueueResourcesGetAllByAccountAbridged() {
    return reqQueueResourcesGetAllByAccountAbridged(this);
  }

  /* QUEUE RESOURCE > CLIP */

  reqQueueResourceClipAddNowPlaying(
    queue_id_text: string,
    clip_id_text: string,
    params?: QueueExtraParams
  ) {
    return reqQueueResourceClipAddNowPlaying(this, queue_id_text, clip_id_text, params);
  }

  reqQueueResourceClipAddNext(queue_id_text: string, clip_id_text: string) {
    return reqQueueResourceClipAddNext(this, queue_id_text, clip_id_text);
  }

  reqQueueResourceClipAddBetween(
    queue_id_text: string,
    clip_id_text: string,
    params: BetweenParams
  ) {
    return reqQueueResourceClipAddBetween(this, queue_id_text, clip_id_text, params);
  }

  reqQueueResourceClipAddLast(queue_id_text: string, clip_id_text: string) {
    return reqQueueResourceClipAddLast(this, queue_id_text, clip_id_text);
  }

  reqQueueResourceClipAddHistory(
    queue_id_text: string,
    clip_id_text: string,
    params?: QueueExtraParams
  ) {
    return reqQueueResourceClipAddHistory(this, queue_id_text, clip_id_text, params);
  }

  reqQueueResourceClipDelete(queue_id_text: string, clip_id_text: string) {
    return reqQueueResourceClipDelete(this, queue_id_text, clip_id_text);
  }

  /* QUEUE RESOURCE > ITEM */

  reqQueueResourceItemAddNowPlaying(
    queue_id_text: string,
    item_id_text: string,
    params?: QueueExtraParams
  ) {
    return reqQueueResourceItemAddNowPlaying(this, queue_id_text, item_id_text, params);
  }

  reqQueueResourceItemAddNext(queue_id_text: string, item_id_text: string) {
    return reqQueueResourceItemAddNext(this, queue_id_text, item_id_text);
  }

  reqQueueResourceItemAddBetween(
    queue_id_text: string,
    item_id_text: string,
    params: BetweenParams
  ) {
    return reqQueueResourceItemAddBetween(this, queue_id_text, item_id_text, params);
  }

  reqQueueResourceItemAddLast(queue_id_text: string, item_id_text: string) {
    return reqQueueResourceItemAddLast(this, queue_id_text, item_id_text);
  }

  reqQueueResourceItemAddHistory(
    queue_id_text: string,
    item_id_text: string,
    params?: QueueExtraParams
  ) {
    return reqQueueResourceItemAddHistory(this, queue_id_text, item_id_text, params);
  }

  reqQueueResourceItemDelete(queue_id_text: string, item_id_text: string) {
    return reqQueueResourceItemDelete(this, queue_id_text, item_id_text);
  }

  /* QUEUE RESOURCE > ITEM ADD BY RSS */

  reqQueueResourceItemAddByRSSAddNowPlaying(
    queue_id_text: string,
    params: QueueExtraParams & { add_by_rss_resource_data: object }
  ) {
    return reqQueueResourceItemAddByRSSAddNowPlaying(this, queue_id_text, params);
  }

  reqQueueResourceItemAddByRSSAddNext(
    queue_id_text: string,
    params: { add_by_rss_resource_data: object }
  ) {
    return reqQueueResourceItemAddByRSSAddNext(this, queue_id_text, params);
  }

  reqQueueResourceItemAddByRSSAddBetween(
    queue_id_text: string,
    params: BetweenParams & { add_by_rss_resource_data: object }
  ) {
    return reqQueueResourceItemAddByRSSAddBetween(this, queue_id_text, params);
  }

  reqQueueResourceItemAddByRSSAddLast(
    queue_id_text: string,
    params: { add_by_rss_resource_data: object }
  ) {
    return reqQueueResourceItemAddByRSSAddLast(this, queue_id_text, params);
  }

  reqQueueResourceItemAddByRSSAddHistory(
    queue_id_text: string,
    params: QueueExtraParams & { add_by_rss_resource_data: object }
  ) {
    return reqQueueResourceItemAddByRSSAddHistory(this, queue_id_text, params);
  }

  reqQueueResourceItemAddByRSSDelete(queue_id_text: string, add_by_rss_hash_id: string) {
    return reqQueueResourceItemAddByRSSDelete(this, queue_id_text, add_by_rss_hash_id);
  }

  /* QUEUE RESOURCE > ITEM SOUNDBITE */

  reqQueueResourceItemSoundbiteAddNowPlaying(
    queue_id_text: string,
    item_soundbite_id_text: string,
    params?: QueueExtraParams
  ) {
    return reqQueueResourceItemSoundbiteAddNowPlaying(
      this,
      queue_id_text,
      item_soundbite_id_text,
      params
    );
  }

  reqQueueResourceItemSoundbiteAddNext(queue_id_text: string, item_soundbite_id_text: string) {
    return reqQueueResourceItemSoundbiteAddNext(this, queue_id_text, item_soundbite_id_text);
  }

  reqQueueResourceItemSoundbiteAddBetween(
    queue_id_text: string,
    item_soundbite_id_text: string,
    params: BetweenParams
  ) {
    return reqQueueResourceItemSoundbiteAddBetween(
      this,
      queue_id_text,
      item_soundbite_id_text,
      params
    );
  }

  reqQueueResourceItemSoundbiteAddLast(queue_id_text: string, item_soundbite_id_text: string) {
    return reqQueueResourceItemSoundbiteAddLast(this, queue_id_text, item_soundbite_id_text);
  }

  reqQueueResourceItemSoundbiteAddHistory(
    queue_id_text: string,
    item_soundbite_id_text: string,
    params?: QueueExtraParams
  ) {
    return reqQueueResourceItemSoundbiteAddHistory(
      this,
      queue_id_text,
      item_soundbite_id_text,
      params
    );
  }

  reqQueueResourceItemSoundbiteDelete(queue_id_text: string, item_soundbite_id_text: string) {
    return reqQueueResourceItemSoundbiteDelete(this, queue_id_text, item_soundbite_id_text);
  }

  /* STATS TRACK */

  reqStatsTrackAccount(account_id_text: string) {
    return reqStatsTrackAccount(this, account_id_text);
  }

  reqStatsTrackChannel(channel_id_text: string) {
    return reqStatsTrackChannel(this, channel_id_text);
  }

  reqStatsTrackClip(clip_id_text: string) {
    return reqStatsTrackClip(this, clip_id_text);
  }

  reqStatsTrackItem(item_id_text: string) {
    return reqStatsTrackItem(this, item_id_text);
  }

  reqStatsTrackPlaylist(playlist_id_text: string) {
    return reqStatsTrackPlaylist(this, playlist_id_text);
  }

  /* PROFILE CONTENT */

  reqProfilePodcastsAZ(params: QueryParamsProfileContent) {
    return reqProfilePodcastsAZ(this, params);
  }

  reqProfileAlbumsAZ(params: QueryParamsProfileContent) {
    return reqProfileAlbumsAZ(this, params);
  }

  reqProfilePlaylistsAZ(params: QueryParamsProfileContent) {
    return reqProfilePlaylistsAZ(this, params);
  }

  reqProfileClipsRecent(params: QueryParamsProfileContent) {
    return reqProfileClipsRecent(this, params);
  }

  /* MY PROFILE CONTENT */

  reqMyProfilePodcastsAZ(params: { page: number }) {
    return reqMyProfilePodcastsAZ(this, params);
  }

  reqMyProfileAlbumsAZ(params: { page: number }) {
    return reqMyProfileAlbumsAZ(this, params);
  }

  reqMyProfilePlaylistsAZ(params: { page: number }) {
    return reqMyProfilePlaylistsAZ(this, params);
  }

  reqMyProfileClipsRecent(params: { page: number }) {
    return reqMyProfileClipsRecent(this, params);
  }
}

export type ApiRequestServiceMethod = {
  [K in keyof ApiRequestService]: ApiRequestService[K] extends (...args: unknown[]) => unknown
    ? ApiRequestService[K]
    : never;
}[keyof ApiRequestService];
