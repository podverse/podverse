import AVFoundation
import Foundation
import UIKit

// The ONE native video surface for the process. Mini player and full player are two React views
// over a single engine and a single `AVPlayerLayer`; expanding **reparents** THIS layer's host view
// into the active RN target instead of creating a second `AVPlayer` or mounting a second RN `<Video>`.
//
// The surface is reparented into the RN-mounted `PodverseVideoSurfaceView` for the active target
// (registered from JS), NOT into a process-global window/content overlay. This keeps correct z-order
// and coordinate space in both the base tab view and the modal.

/// Named layout targets the single video surface can occupy. RN mounts a `PodverseVideoSurfaceView`
/// per target and passes the matching `targetId`.
enum PodverseVideoTargetId: String {
  case mini
  case full
}

/// Owns the one `AVPlayerLayer`, bound to `PodverseAudioEngine.shared`'s single player. Access via
/// `PodverseVideoSurfaceHost.shared`.
public final class PodverseVideoSurfaceHost: NSObject {
  /// The one and only video surface host for the process.
  @objc public static let shared = PodverseVideoSurfaceHost()

  /// A `UIView` whose backing layer is the single `AVPlayerLayer`. Using `layerClass` keeps exactly
  /// one layer tied to the view's lifetime — there is never a second video layer.
  final class HostContainerView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }

    /// The backing `AVPlayerLayer`. Force-cast is the standard idiom for a custom `layerClass`.
    var playerLayer: AVPlayerLayer {
      // swiftlint:disable:next force_cast
      layer as! AVPlayerLayer
    }
  }

  /// Weak reference to an RN target view (so RN unmount deallocates it).
  private final class WeakViewBox {
    weak var view: UIView?
    init(_ view: UIView) { self.view = view }
  }

  /// The transparent overlay view that paints video frames. Reparented into the active target's RN
  /// view; hidden until a video item is active.
  let containerView = HostContainerView()

  /// RN-mounted target views by id. Populated by `PodverseVideoSurfaceView` on attach; the single
  /// surface is reparented into the active target's view.
  private var targetViews: [PodverseVideoTargetId: WeakViewBox] = [:]

  /// The target the surface occupies (`nil` when unplaced / hidden).
  private var activeTarget: PodverseVideoTargetId?

  /// Tracks the last capability reported by the engine. The surface is only shown when the current
  /// item actually has video frames — so a video-medium item playing its audio enclosure never
  /// leaves a black rectangle.
  private var currentItemHasVideo = false

  /// JS-desired visibility for the active target (RN drives this from the playback target kind via
  /// `setVideoSurfaceVisible`). Final visibility = `desiredVisible && currentItemHasVideo`.
  private var desiredVisible = false

  private override init() {
    super.init()
    containerView.isUserInteractionEnabled = false
    containerView.backgroundColor = .clear
    containerView.isHidden = true
    containerView.playerLayer.videoGravity = .resizeAspect
    containerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

    // Bind the one `AVPlayerLayer` to the one shared `AVPlayer`. This is the only place a layer is
    // attached to the engine's player.
    containerView.playerLayer.player = PodverseAudioEngine.shared.sharedPlayer

    // Record video capability so audio-only items keep the surface hidden.
    PodverseAudioEngine.shared.onVideoCapabilityChanged = { [weak self] hasVideo in
      self?.onMain {
        guard let self = self else { return }
        self.currentItemHasVideo = hasVideo
        self.updateVisibility()
      }
    }
  }

  // MARK: - RN-facing API (called by PodverseVideoSurfaceView + the Expo module)

  /// Register (or replace) the RN view for `target`. The first registered target becomes active so
  /// the single surface is placed; if `target` is the active one, reparent into it immediately.
  /// Never loads/destroys the player.
  func registerTargetView(_ target: PodverseVideoTargetId, view: UIView) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.targetViews[target] = WeakViewBox(view)
      if self.activeTarget == nil {
        self.activeTarget = target
      }
      if self.activeTarget == target {
        self.reparentIntoActiveTarget()
      }
    }
  }

  /// Unregister an RN view (on RN unmount). Only clears when the going-away view is the registered
  /// one (avoids clobbering a re-registered view during a fast remount). If it was the
  /// active target's view, detach the surface (kept alive; just no host).
  func unregisterTargetView(_ target: PodverseVideoTargetId, view: UIView) {
    onMain { [weak self] in
      guard let self = self else { return }
      guard self.targetViews[target]?.view === view else { return }
      self.targetViews[target] = nil
      if self.activeTarget == target {
        self.containerView.removeFromSuperview()
        self.updateVisibility()
      }
    }
  }

  /// Move the single surface to a registered target. Only reparenting/geometry changes; the `AVPlayer`
  /// and playhead are untouched.
  func setActiveTarget(_ target: PodverseVideoTargetId, animatedDuration: TimeInterval = 0) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.activeTarget = target
      self.reparentIntoActiveTarget(animatedDuration: animatedDuration)
    }
  }

  /// Set the JS-desired visibility for the active target (RN drives this from the playback target
  /// kind). The surface only actually shows when the current item also has video frames. Never
  /// tears down the player.
  func setVisible(_ visible: Bool) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.desiredVisible = visible
      self.updateVisibility()
    }
  }

  /// True when the current item has video frames to present. Visibility policy (auto show/hide for
  /// audio-only) combines this with `desiredVisible`.
  func hasVideo() -> Bool { currentItemHasVideo }

  /// Called from the active target view's `layoutSubviews` so the surface tracks size changes
  /// (rotation, split view, full-player expand). Main-thread only.
  func layoutSurface(in view: UIView, for target: PodverseVideoTargetId) {
    onMain { [weak self] in
      guard let self = self else { return }
      guard self.activeTarget == target, self.targetViews[target]?.view === view else { return }
      self.containerView.frame = view.bounds
    }
  }

  // MARK: - Helpers

  /// Reparent the single surface into the active target's RN view and fill its bounds. Safe no-op
  /// (just recomputes visibility) when the active target has no registered view yet — it will
  /// reparent when that view registers.
  private func reparentIntoActiveTarget(animatedDuration: TimeInterval = 0) {
    guard let target = activeTarget, let host = targetViews[target]?.view else {
      updateVisibility()
      return
    }
    if containerView.superview !== host {
      containerView.removeFromSuperview()
      host.addSubview(containerView)
    }
    let apply: () -> Void = { [weak self] in
      guard let self = self else { return }
      self.containerView.frame = host.bounds
    }
    if animatedDuration > 0 {
      UIView.animate(withDuration: animatedDuration, animations: apply)
    } else {
      apply()
    }
    updateVisibility()
  }

  /// Recompute surface visibility from JS intent + native capability + placement. Main-thread only.
  private func updateVisibility() {
    let hasHost = activeTarget.flatMap { targetViews[$0]?.view } != nil
    containerView.isHidden = !(desiredVisible && currentItemHasVideo && hasHost)
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async(execute: work)
    }
  }
}
