package expo.modules.podversemediaengine

import android.content.Context
import androidx.media3.common.C
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi

/**
 * The player the media session hands to Android Auto, the notification, and headsets. It wraps the
 * one shared ExoPlayer and sends loads and track skips through [PodverseAudioEngine], so every
 * source carries its identity into the journal and JS adoption. Never give the session the bare
 * ExoPlayer: a playlist set on it would advance without the engine knowing which item is playing.
 */
@androidx.annotation.OptIn(UnstableApi::class)
class PodverseSessionPlayer(private val context: Context, player: Player) :
  ForwardingPlayer(player) {

  override fun getAvailableCommands(): Player.Commands {
    val commands = super.getAvailableCommands()
    if (!PodverseAudioEngine.isMusicSourceLoaded()) return commands
    return commands
      .buildUpon()
      .addAll(
        Player.COMMAND_SEEK_TO_NEXT,
        Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
        Player.COMMAND_SEEK_TO_PREVIOUS,
        Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
      )
      .build()
  }

  override fun isCommandAvailable(command: Int): Boolean = availableCommands.contains(command)

  /**
   * Play on a live source goes through the engine, which resumes in place or jumps to live by the
   * live window. Media3 already drops seek commands for an unseekable item and bounds seek back and
   * forward to the window.
   */
  override fun play() {
    if (PodverseAudioEngine.isLiveSourceLoaded()) {
      PodverseAudioEngine.play(context)
    } else {
      super.play()
    }
  }

  override fun setPlayWhenReady(playWhenReady: Boolean) {
    if (playWhenReady && PodverseAudioEngine.isLiveSourceLoaded()) {
      PodverseAudioEngine.play(context)
    } else {
      super.setPlayWhenReady(playWhenReady)
    }
  }

  override fun seekToNext() {
    if (PodverseAudioEngine.isMusicSourceLoaded()) {
      PodverseAudioEngine.handleRemoteTrackCommand("next")
    } else {
      super.seekToNext()
    }
  }

  override fun seekToNextMediaItem() = seekToNext()

  override fun seekToPrevious() {
    if (PodverseAudioEngine.isMusicSourceLoaded()) {
      PodverseAudioEngine.handleRemoteTrackCommand("previous")
    } else {
      super.seekToPrevious()
    }
  }

  override fun seekToPreviousMediaItem() = seekToPrevious()

  override fun setMediaItems(mediaItems: MutableList<MediaItem>, startIndex: Int, startPositionMs: Long) {
    if (!loadThroughEngine(mediaItems.getOrNull(startIndex), startPositionMs)) {
      super.setMediaItems(mediaItems, startIndex, startPositionMs)
    }
  }

  override fun setMediaItems(mediaItems: MutableList<MediaItem>, resetPosition: Boolean) {
    if (!loadThroughEngine(mediaItems.firstOrNull(), C.TIME_UNSET)) {
      super.setMediaItems(mediaItems, resetPosition)
    }
  }

  override fun setMediaItem(mediaItem: MediaItem, startPositionMs: Long) {
    if (!loadThroughEngine(mediaItem, startPositionMs)) {
      super.setMediaItem(mediaItem, startPositionMs)
    }
  }

  override fun setMediaItem(mediaItem: MediaItem, resetPosition: Boolean) {
    if (!loadThroughEngine(mediaItem, C.TIME_UNSET)) {
      super.setMediaItem(mediaItem, resetPosition)
    }
  }

  /**
   * Load an item the library service resolved (it carries the engine source metadata) as the
   * engine's only item. Items without that metadata are not ours to interpret and pass through.
   */
  private fun loadThroughEngine(item: MediaItem?, startPositionMs: Long): Boolean {
    val metaJson = item?.mediaMetadata?.extras?.getString(META_JSON_EXTRA) ?: return false
    val uri = item.localConfiguration?.uri?.toString() ?: return false
    val seekSeconds =
      if (startPositionMs == C.TIME_UNSET || startPositionMs <= 0) null else startPositionMs / 1000.0
    PodverseAudioEngine.loadAndStart(context, uri, seekSeconds, null, null, metaJson)
    return true
  }

  companion object {
    const val META_JSON_EXTRA = "podverse.sourceMetaJson"
  }
}
