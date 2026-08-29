import ExpoModulesCore
import UIKit

// The RN-mounted host for the ONE shared video surface. Mini player and full player each mount one
// `PodverseVideoSurfaceView` with a `targetId`; the single `AVPlayerLayer`-backed surface owned by
// `PodverseVideoSurfaceHost` is **reparented** into whichever view is the active target. Because
// these views live inside the RN tree — the full player is a React Navigation native-stack modal
// (its own view controller / z-order) — the surface renders correctly in both states. The process
// uses one player and one layer.
public final class PodverseVideoSurfaceView: ExpoView {
  private var targetId: PodverseVideoTargetId?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    isUserInteractionEnabled = false
    backgroundColor = .clear
  }

  /// `targetId` prop from JS (`mini` / `full`). Re-registers with the host when it changes.
  func setTargetId(_ raw: String) {
    let parsed = PodverseVideoTargetId(rawValue: raw)
    guard parsed != targetId else { return }
    if let previous = targetId {
      PodverseVideoSurfaceHost.shared.unregisterTargetView(previous, view: self)
    }
    targetId = parsed
    if let parsed = parsed, window != nil {
      PodverseVideoSurfaceHost.shared.registerTargetView(parsed, view: self)
    }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let targetId = targetId else { return }
    if window != nil {
      PodverseVideoSurfaceHost.shared.registerTargetView(targetId, view: self)
    } else {
      PodverseVideoSurfaceHost.shared.unregisterTargetView(targetId, view: self)
    }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    guard let targetId = targetId else { return }
    // Observe size changes (rotation, split view, mini↔full) so the reparented surface fills us.
    PodverseVideoSurfaceHost.shared.layoutSurface(in: self, for: targetId)
  }
}
