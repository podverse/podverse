import AVFoundation
import AVKit
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
  case fullscreen
}

/// Owns the one `AVPlayerLayer`, bound to `PodverseAudioEngine.shared`'s single player. Access via
/// `PodverseVideoSurfaceHost.shared`.
public final class PodverseVideoSurfaceHost: NSObject, AVPictureInPictureControllerDelegate {
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

  /// Video fullscreen is the active surface. Picture-in-picture starts from that state when the
  /// viewer leaves the app.
  private var fullscreenActive = false

  /// Keep the player on the layer across a background transition so the system can move it into
  /// picture-in-picture. Cleared when that window does not start.
  private var keepPlayerAttachedForPictureInPicture = false

  /// The viewer tapped the picture-in-picture window to return, as opposed to closing it.
  private var restoringFromPictureInPicture = false

  private var pipController: AVPictureInPictureController?

  /// Fired when the surface's presented state changes (`desiredVisible &&` video frames `&&` a host).
  var onVideoPresentedChanged: ((Bool) -> Void)?

  /// Fired when the system picture-in-picture window starts or stops.
  var onPictureInPictureChanged: ((Bool, Bool) -> Void)?

  private var lastPresented: Bool?

  private override init() {
    super.init()
    containerView.isUserInteractionEnabled = false
    containerView.backgroundColor = .clear
    containerView.isHidden = true
    containerView.playerLayer.videoGravity = .resizeAspect
    containerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

    // Bind the one `AVPlayerLayer` to the one shared `AVPlayer`. This is the only place a layer is
    // attached to the engine's player.
    bindPlayerLayer()
    // `applicationState` is main-thread only, and the host can be created from the JS thread.
    onMain { [weak self] in
      guard let self = self else { return }
      self.isInBackground = UIApplication.shared.applicationState == .background
      self.bindPlayerLayer()
    }

    // Record video capability so audio-only items keep the surface hidden.
    PodverseAudioEngine.shared.onVideoCapabilityChanged = { [weak self] hasVideo in
      self?.onMain {
        guard let self = self else { return }
        self.currentItemHasVideo = hasVideo
        self.updateVisibility()
      }
    }

    PodverseAudioEngine.shared.onPlayerReplaced = { [weak self] _ in
      self?.onMain {
        self?.pipController = nil
        self?.bindPlayerLayer()
        self?.configurePictureInPicture()
      }
    }

    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(handleDidEnterBackground),
      name: UIApplication.didEnterBackgroundNotification, object: nil)
    center.addObserver(
      self, selector: #selector(handleWillEnterForeground),
      name: UIApplication.willEnterForegroundNotification, object: nil)
  }

  // MARK: - Background playback

  /// iOS pauses an `AVPlayer` that is attached to an `AVPlayerLayer` once the app leaves the
  /// foreground (including a screen lock). Detaching the layer in the background lets a video
  /// item keep playing as audio. The layer stays attached when fullscreen picture-in-picture can
  /// take it; if that window has not started a moment later, the layer detaches.
  private var isInBackground = false

  @objc private func handleDidEnterBackground() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.isInBackground = true
      let pipActive = self.pipController?.isPictureInPictureActive == true
      let pipPossible =
        self.fullscreenActive && self.pipController?.isPictureInPicturePossible == true
      self.keepPlayerAttachedForPictureInPicture = pipActive || pipPossible
      self.bindPlayerLayer()
      guard pipPossible && !pipActive else { return }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
        guard let self = self else { return }
        guard self.isInBackground, self.pipController?.isPictureInPictureActive != true else {
          return
        }
        self.keepPlayerAttachedForPictureInPicture = false
        self.bindPlayerLayer()
      }
    }
  }

  @objc private func handleWillEnterForeground() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.isInBackground = false
      self.bindPlayerLayer()
    }
  }

  /// Main-thread only. Attach the layer to the engine's current player while foregrounded, and
  /// while picture-in-picture is taking the layer.
  private func bindPlayerLayer() {
    let attach = !isInBackground || keepPlayerAttachedForPictureInPicture
    containerView.playerLayer.player = attach ? PodverseAudioEngine.shared.sharedPlayer : nil
  }

  /// True when the surface is actually showing frames.
  func isVideoPresented() -> Bool {
    desiredVisible && currentItemHasVideo && activeTarget.flatMap { targetViews[$0]?.view } != nil
  }

  /// Video fullscreen changed. Picture-in-picture is offered only from that surface.
  func setFullscreenActive(_ active: Bool) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.fullscreenActive = active
      self.configurePictureInPicture()
    }
  }

  /// Main-thread only. One controller for the single player layer.
  private func configurePictureInPicture() {
    guard AVPictureInPictureController.isPictureInPictureSupported() else { return }
    if pipController == nil {
      let source = AVPictureInPictureController.ContentSource(
        playerLayer: containerView.playerLayer)
      let controller = AVPictureInPictureController(contentSource: source)
      controller.delegate = self
      pipController = controller
    }
    pipController?.canStartPictureInPictureAutomaticallyFromInline = fullscreenActive
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

  /// Reparent the single surface into the active target's RN view and fill its bounds. When that
  /// view is not registered yet, leave the current presented state unchanged. Registration
  /// reparents once the view is in the window.
  private func reparentIntoActiveTarget(animatedDuration: TimeInterval = 0) {
    guard let target = activeTarget, let host = targetViews[target]?.view else {
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
    let presented = isVideoPresented()
    containerView.isHidden = !presented
    guard lastPresented != presented else { return }
    lastPresented = presented
    onVideoPresentedChanged?(presented)
  }

  // MARK: - Picture in picture

  public func pictureInPictureControllerDidStartPictureInPicture(
    _ pictureInPictureController: AVPictureInPictureController
  ) {
    keepPlayerAttachedForPictureInPicture = true
    onPictureInPictureChanged?(true, false)
  }

  public func pictureInPictureController(
    _ pictureInPictureController: AVPictureInPictureController,
    failedToStartPictureInPictureWithError error: Error
  ) {
    guard isInBackground else { return }
    keepPlayerAttachedForPictureInPicture = false
    bindPlayerLayer()
  }

  public func pictureInPictureController(
    _ pictureInPictureController: AVPictureInPictureController,
    restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler:
      @escaping (Bool) -> Void
  ) {
    restoringFromPictureInPicture = true
    completionHandler(true)
  }

  public func pictureInPictureControllerDidStopPictureInPicture(
    _ pictureInPictureController: AVPictureInPictureController
  ) {
    let restore = restoringFromPictureInPicture
    restoringFromPictureInPicture = false
    onPictureInPictureChanged?(false, restore)
    guard !restore, isInBackground else { return }
    keepPlayerAttachedForPictureInPicture = false
    bindPlayerLayer()
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async(execute: work)
    }
  }
}
