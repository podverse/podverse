package expo.modules.podversemediaengine

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

// The RN-mounted host for the ONE shared video surface. Mini player and full player each mount one
// `PodverseVideoSurfaceView` with a `targetId`; the single `SurfaceView` owned by
// `PodverseVideoSurfaceHost` is **reparented** into whichever view is the active target. Because
// these views live inside the RN tree — the full player is a React Navigation native-stack modal
// (react-native-screens fragment / its own window) — the surface renders correctly in both states.
// The process uses one ExoPlayer and one SurfaceView.
class PodverseVideoSurfaceView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext) {
  private var targetId: String? = null

  /** `targetId` prop from JS (`mini` / `full`). Re-registers with the host when it changes. */
  fun setTargetId(value: String) {
    if (value == targetId) return
    targetId?.let { PodverseVideoSurfaceHost.unregisterTargetView(it, this) }
    targetId = value
    if (isAttachedToWindow) {
      PodverseVideoSurfaceHost.registerTargetView(value, this)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    targetId?.let { PodverseVideoSurfaceHost.registerTargetView(it, this) }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    targetId?.let { PodverseVideoSurfaceHost.unregisterTargetView(it, this) }
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    // Observe size changes (rotation, mini↔full) so the reparented surface fills us.
    targetId?.let { PodverseVideoSurfaceHost.layoutSurface(this, it) }
  }
}
