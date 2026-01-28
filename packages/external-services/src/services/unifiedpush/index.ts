// import { getUPDevicesForPodcastId, UPEndpointData } from 'podverse-orm'
// import { promiseAllSkippingErrors } from 'podverse-shared'
// import { SendNotificationOptions } from '../notifications'

// const webpush = require('web-push')

// export class UnifiedPushService {
//   sendUpNewEpisodeDetectedNotification = async (options: SendNotificationOptions) => {
//     const { podcastId, podcastShrunkImageUrl, episodeId } = options
//     const upDevices = await getUPDevicesForPodcastId(podcastId)
//     const podcastTitle = options.podcastTitle || 'Untitled Podcast'
//     const episodeTitle = options.episodeTitle || 'Untitled Episode'
//     const title = podcastTitle
//     const body = episodeTitle

//     // NOTE: Only allow shrunk image urls to be used, in case large image sizes
//     // cause issues with UnifiedPush distributors.
//     const finalPodcastImageUrl = podcastShrunkImageUrl
//     const finalEpisodeImageUrl = ''

//     return this.sendUPNotification(
//       upDevices,
//       title,
//       body,
//       podcastId,
//       'new-episode',
//       podcastTitle,
//       episodeTitle,
//       finalPodcastImageUrl,
//       finalEpisodeImageUrl,
//       episodeId
//     )
//   }

//   sendUpLiveItemLiveDetectedNotification = async (options: SendNotificationOptions) => {
//     const { podcastId, podcastShrunkImageUrl, episodeId } = options
//     const upDevices = await getUPDevicesForPodcastId(podcastId)
//     const podcastTitle = options.podcastTitle || 'Untitled Podcast'
//     const episodeTitle = options.episodeTitle || 'Livestream starting'
//     const title = `LIVE: ${podcastTitle}`
//     const body = episodeTitle

//     // NOTE: Only allow shrunk image urls to be used, in case large image sizes
//     // cause issues with UnifiedPush distributors.
//     const finalPodcastImageUrl = podcastShrunkImageUrl
//     const finalEpisodeImageUrl = ''

//     return this.sendUPNotification(
//       upDevices,
//       title,
//       body,
//       podcastId,
//       'live',
//       podcastTitle,
//       episodeTitle,
//       finalPodcastImageUrl,
//       finalEpisodeImageUrl,
//       episodeId
//     )
//   }

//   sendUPNotification = async (
//     upDevices: UPEndpointData[],
//     title: string,
//     body: string,
//     podcastId: string,
//     notificationType: 'live' | 'new-episode',
//     podcastTitle: string,
//     episodeTitle: string,
//     podcastImage?: string | null,
//     episodeImage?: string,
//     episodeId?: string
//   ) => {
//     if (!upDevices || upDevices.length === 0) return

//     const upDeviceBatches: UPEndpointData[][] = []
//     const size = 100
//     for (let i = 0; i < upDevices.length; i += size) {
//       upDeviceBatches.push(upDevices.slice(i, i + size))
//     }

//     const data = {
//       body,
//       title,
//       podcastId,
//       episodeId,
//       podcastTitle: podcastTitle,
//       episodeTitle: episodeTitle,
//       notificationType,
//       timeSent: new Date().toISOString(),
//       image: episodeImage || podcastImage
//     }
//     const jsonPayload = JSON.stringify(data)

//     for (const upDeviceBatch of upDeviceBatches) {
//       if (upDeviceBatch?.length > 0) {
//         try {
//           await promiseAllSkippingErrors(
//             upDeviceBatch.map((upd: UPEndpointData) =>
//               webpush.sendNotification(
//                 {
//                   endpoint: upd.upEndpoint,
//                   keys: {
//                     auth: upd.upAuthKey,
//                     p256dh: upd.upPublicKey
//                   }
//                 },
//                 jsonPayload
//               )
//             )
//           )
//         } catch (error) {
//           console.log('sendUPNotification error', error)
//         }
//       }
//     }
//   }
// }
