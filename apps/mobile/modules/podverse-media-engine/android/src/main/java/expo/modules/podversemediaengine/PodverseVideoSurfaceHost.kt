package expo.modules.podversemediaengine

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.TextureView
import android.view.View
import android.view.ViewGroup
import java.lang.ref.WeakReference

// PG-5 steps 2.15 + 2.17 (details 094, 096) + Plan 01 gap remediation (detail 099 addendum).
//
// The ONE native video surface for the process. Mini player and full player are two React views
// over a single ExoPlayer and a single TextureView; expanding **reparents** THIS view into the
// active RN target (2.20) instead of creating a second player or mounting a second RN <Video>
// (Track 11.18 anti-pattern).
//
// TextureView (not SurfaceView): SurfaceView has a separate compositor window and throws
// `IllegalStateException: child already has a parent` when reparented during React Navigation
// native-stack modal fragment transitions (MainActivity onPause). TextureView is a normal view and
// reparents cleanly between the mini and full PodverseVideoSurfaceView hosts.
object PodverseVideoSurfaceHost {
  /** Stable target ids the single surface can occupy. RN mounts a `PodverseVideoSurfaceView` each. */
  const val TARGET_MINI = "mini"
  const val TARGET_FULL = "full"

  private val mainHandler = Handler(Looper.getMainLooper())

  /** The one and only video TextureView. Bound to the shared ExoPlayer via the engine. */
  private var textureView: TextureView? = null

  /** RN-mounted target views by id. The single surface is reparented into the active target's view. */
  private val targetViews = mutableMapOf<String, WeakReference<ViewGroup>>()

  /** The target the surface currently occupies (`null` when unplaced / hidden). */
  private var activeTarget: String? = null

  /**
   * Last capability reported by the engine. The surface only shows when the current item actually
   * has video frames — so a video-medium item playing its audio enclosure never leaves a black
   * rectangle (2.23).
   */
  private var currentItemHasVideo = false

  /**
   * JS-desired visibility for the active target (RN drives this from the playback target kind via
   * `setVideoSurfaceVisible`). Final visibility = `desiredVisible && currentItemHasVideo`.
   */
  private var desiredVisible = false

  /**
   * Return the single [TextureView], creating it and binding it to the shared ExoPlayer on first
   * use. There is exactly one surface for the process; callers must not create their own.
   */
  fun getOrCreateSurface(context: Context): TextureView {
    return onMainSync {
      textureView
        ?: TextureView(context.applicationContext).also { view ->
          view.visibility = View.GONE
          textureView = view
          // Bind the one texture to the one shared player.
          PodverseAudioEngine.attachVideoTextureView(view)
          // Track video capability so the host can hide itself for audio-only items (policy 2.23).
          PodverseAudioEngine.onVideoCapabilityChanged = { hasVideo ->
            onMain {
              currentItemHasVideo = hasVideo
              updateVisibility()
            }
          }
        }
    }
  }

  // MARK: - RN-facing API (called by PodverseVideoSurfaceView + the Expo module)

  /**
   * Register (or replace) the RN view for [target]. The first registered target becomes active so
   * the single surface is placed; if [target] is active, reparent into it. Never loads/releases.
   */
  fun registerTargetView(target: String, view: ViewGroup) {
    onMain {
      targetViews[target] = WeakReference(view)
      if (activeTarget == null) {
        activeTarget = target
      }
      if (activeTarget == target) {
        reparentIntoActiveTarget()
      }
    }
  }

  /**
   * Unregister an RN view (on RN unmount). Only clears when the going-away view is the currently
   * registered one (avoids clobbering a re-registered view during a fast remount). If it was the
   * active target's view, detach the surface (kept alive; just no host).
   */
  fun unregisterTargetView(target: String, view: ViewGroup) {
    onMain {
      if (targetViews[target]?.get() === view) {
        targetViews.remove(target)
        if (activeTarget == target) {
          (textureView?.parent as? ViewGroup)?.removeView(textureView)
          updateVisibility()
        }
      }
    }
  }

  /**
   * Move the single surface to a registered target — bridge `animateVideoSurface` (2.19/2.20). Only
   * reparenting/geometry changes; the ExoPlayer and playhead are untouched.
   */
  fun setActiveTarget(target: String, animatedDurationMs: Long = 0) {
    onMain {
      activeTarget = target
      reparentIntoActiveTarget()
    }
  }

  /**
   * Set the JS-desired visibility for the active target (RN drives this from the playback target
   * kind). The surface only actually shows when the current item also has video frames. Never
   * releases the player.
   */
  fun setVisible(visible: Boolean) {
    onMain {
      desiredVisible = visible
      updateVisibility()
    }
  }

  /** True when the current item has video frames to present (combined with `desiredVisible`, 2.23). */
  fun hasVideo(): Boolean = currentItemHasVideo

  /**
   * Called from the active target view's `onLayout` so the surface tracks size changes (rotation,
   * mini↔full). Main-thread only.
   */
  fun layoutSurface(view: ViewGroup, target: String) {
    onMain {
      if (activeTarget != target || targetViews[target]?.get() !== view) return@onMain
      val tv = textureView ?: return@onMain
      val params = tv.layoutParams ?: ViewGroup.LayoutParams(view.width, view.height)
      params.width = view.width.coerceAtLeast(1)
      params.height = view.height.coerceAtLeast(1)
      tv.layoutParams = params
    }
  }

  // MARK: - Helpers

  /**
   * Reparent the single texture into the active target's RN view and fill its bounds. Safe no-op
   * when the active target has no registered view yet. Defensive remove-before-add so a concurrent
   * register during modal fragment attach cannot throw `child already has a parent`.
   */
  private fun reparentIntoActiveTarget() {
    val target = activeTarget ?: run {
      updateVisibility()
      return
    }
    val host = targetViews[target]?.get() ?: run {
      updateVisibility()
      return
    }
    val tv = getOrCreateSurface(host.context)
    if (tv.parent === host) {
      updateVisibility()
      return
    }
    (tv.parent as? ViewGroup)?.removeView(tv)
    if (tv.parent != null) {
      (tv.parent as? ViewGroup)?.removeView(tv)
    }
    if (tv.parent == null) {
      val width = if (host.width > 0) host.width else ViewGroup.LayoutParams.MATCH_PARENT
      val height = if (host.height > 0) host.height else ViewGroup.LayoutParams.MATCH_PARENT
      host.addView(tv, ViewGroup.LayoutParams(width, height))
    }
    updateVisibility()
  }

  /** Recompute surface visibility from JS intent + native capability + placement. Main-thread only. */
  private fun updateVisibility() {
    val hasHost = activeTarget?.let { targetViews[it]?.get() } != null
    val visible = desiredVisible && currentItemHasVideo && hasHost
    textureView?.visibility = if (visible) View.VISIBLE else View.GONE
  }

  private fun onMain(work: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) work() else mainHandler.post(work)
  }

  private fun <T> onMainSync(block: () -> T): T {
    if (Looper.myLooper() == Looper.getMainLooper()) return block()
    val latch = java.util.concurrent.CountDownLatch(1)
    var result: T? = null
    var error: Throwable? = null
    mainHandler.post {
      try {
        result = block()
      } catch (t: Throwable) {
        error = t
      } finally {
        latch.countDown()
      }
    }
    latch.await()
    error?.let { throw it }
    @Suppress("UNCHECKED_CAST")
    return result as T
  }
}
