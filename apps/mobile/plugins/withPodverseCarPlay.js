/**
 * Expo config plugin: wire the CarPlay scene AND the iOS 26 phone window scene through
 * AppDelegate, without putting a CarPlay-only `UIApplicationSceneManifest` in Info.plist.
 *
 * Two failure modes this guards against:
 *
 * 1. CarPlay-only manifest — declaring `UIApplicationSceneManifest` with only
 *    `CPTemplateApplicationSceneSessionRoleApplication` (or a bare phone window scene with no
 *    delegate) suppresses the default phone `UIWindowScene`; RN's `RCTKeyWindow()` returns nil →
 *    `RNCSafeAreaProvider` / Dimensions crash → black phone screen.
 *
 * 2. iOS 26 UIScene enforcement — iOS 26 makes the UIScene lifecycle mandatory. Because this
 *    AppDelegate implements `configurationForConnectingSceneSession:` (for CarPlay), the PHONE
 *    window is also routed through a `UIWindowScene`. RCTAppDelegate (Expo SDK 52) still creates
 *    `self.window` in `didFinishLaunchingWithOptions` before any scene exists, so that window is
 *    never attached to the scene → `RCTKeyWindow()` nil → black phone screen. Returning a bare
 *    Default Configuration for the phone role is NOT enough on iOS 26; the phone scene needs a
 *    delegate (`PodversePhoneSceneDelegate`) that re-attaches the existing window to the scene.
 *
 * CarPlay audio entitlement + App Group stay in `app.config.ts` entitlements. The Swift
 * `PodverseCarPlaySceneDelegate` remains the CarPlay scene delegate class; this plugin teaches
 * AppDelegate to return that configuration for CarPlay sessions and the phone scene delegate for
 * the phone window.
 *
 * REGRESSION GUARD — do NOT reintroduce a CarPlay-only `UIApplicationSceneManifest`:
 * app-closed CarPlay is proven with this dynamic path (2026-07-28: phone force-quit → tap Podverse
 * on CarPlay Home → app cold-launches, App Group cache read, root template renders). The
 * `com.apple.developer.carplay-audio` entitlement — not a scene manifest — registers the CarPlay
 * Home icon and triggers cold-launch, so a manifest is unnecessary AND harmful (it suppresses the
 * phone `UIWindowScene` → black screen). See `.llm/plans/completed/mobile-carplay-app-closed-scene/`
 * and result [4] of the iOS 26 scene write-up (window.windowScene re-attach).
 */
const { withAppDelegate, createRunOncePlugin } = require('expo/config-plugins');

const MARKER_BEGIN = '// @generated begin podverse-carplay-scene';
const MARKER_END = '// @generated end podverse-carplay-scene';
const PHONE_MARKER_BEGIN = '// @generated begin podverse-phone-scene';
const PHONE_MARKER_END = '// @generated end podverse-phone-scene';

// File-scope phone window scene delegate. Inserted BEFORE @implementation AppDelegate so the
// configuration method below can reference [PodversePhoneSceneDelegate class]. See header for why
// this is required on iOS 26 (window re-attach; otherwise black screen).
const PHONE_SCENE_CLASS = `
${PHONE_MARKER_BEGIN}
@interface PodversePhoneSceneDelegate : UIResponder <UIWindowSceneDelegate>
@end

@implementation PodversePhoneSceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }
  UIWindowScene *windowScene = (UIWindowScene *)scene;
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  UIWindow *window = appDelegate.window;
  if (window != nil) {
    window.windowScene = windowScene;
    [window makeKeyAndVisible];
  }
  for (UIOpenURLContext *context in connectionOptions.URLContexts) {
    [RCTLinkingManager application:UIApplication.sharedApplication
                          openURL:context.URL
                          options:@{}];
  }
}

- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)URLContexts
{
  for (UIOpenURLContext *context in URLContexts) {
    [RCTLinkingManager application:UIApplication.sharedApplication
                          openURL:context.URL
                          options:@{}];
  }
}

@end
${PHONE_MARKER_END}
`;

const CARPLAY_METHOD = `
${MARKER_BEGIN}
// CarPlay scene (master 12.7). Prefer AppDelegate configuration over a CarPlay-only
// UIApplicationSceneManifest so the phone UIWindowScene / RCTKeyWindow stay intact.
- (UISceneConfiguration *)application:(UIApplication *)application
configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession
options:(UISceneConnectionOptions *)options
{
  if ([connectingSceneSession.role isEqualToString:CPTemplateApplicationSceneSessionRoleApplication]) {
    UISceneConfiguration *configuration =
        [[UISceneConfiguration alloc] initWithName:@"PodverseCarPlay"
                                       sessionRole:connectingSceneSession.role];
    configuration.sceneClass = [CPTemplateApplicationScene class];
    configuration.delegateClass = NSClassFromString(@"PodverseCarPlaySceneDelegate");
    return configuration;
  }
  // Non-CarPlay (phone window) scene. iOS 26 routes the phone window through UIScene, so give it a
  // delegate that re-attaches RCTAppDelegate's existing window to the scene
  // (PodversePhoneSceneDelegate). Do NOT call [super application:configurationForConnecting
  // SceneSession:options:] — RCTAppDelegate does not implement it, so a super dispatch (even behind
  // [super respondsToSelector:], which is evaluated against self) raises an unrecognized-selector
  // SIGABRT at launch. A bare Default Configuration (no delegate) would leave RN's window unattached
  // -> RCTKeyWindow() nil -> black screen.
  UISceneConfiguration *phoneConfiguration =
      [[UISceneConfiguration alloc] initWithName:@"Default Configuration"
                                     sessionRole:connectingSceneSession.role];
  phoneConfiguration.delegateClass = [PodversePhoneSceneDelegate class];
  return phoneConfiguration;
}
${MARKER_END}
`;

function ensureCarPlayImport(contents) {
  if (contents.includes('#import <CarPlay/CarPlay.h>')) {
    return contents;
  }
  if (contents.includes('#import "AppDelegate.h"')) {
    return contents.replace(
      '#import "AppDelegate.h"',
      '#import "AppDelegate.h"\n\n#import <CarPlay/CarPlay.h>'
    );
  }
  return `#import <CarPlay/CarPlay.h>\n${contents}`;
}

function withPodverseCarPlayAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(MARKER_BEGIN)) {
      return config;
    }
    contents = ensureCarPlayImport(contents);

    // Insert the phone scene delegate class at file scope, right before @implementation AppDelegate,
    // so the CarPlay configuration method can reference [PodversePhoneSceneDelegate class].
    const appImplToken = '@implementation AppDelegate';
    const appImplIdx = contents.indexOf(appImplToken);
    if (appImplIdx === -1) {
      throw new Error('withPodverseCarPlayAppDelegate: could not find @implementation AppDelegate');
    }
    contents = `${contents.slice(0, appImplIdx)}${PHONE_SCENE_CLASS}\n${contents.slice(appImplIdx)}`;

    // Insert the configuration method inside @implementation AppDelegate (before its @end, which is
    // the LAST @end in the file after the phone-scene @implementation was added above).
    const endIdx = contents.lastIndexOf('@end');
    if (endIdx === -1) {
      throw new Error('withPodverseCarPlayAppDelegate: could not find @end in AppDelegate');
    }
    contents = `${contents.slice(0, endIdx)}${CARPLAY_METHOD}\n${contents.slice(endIdx)}`;
    config.modResults.contents = contents;
    return config;
  });
}

const withPodverseCarPlay = (config) => withPodverseCarPlayAppDelegate(config);

module.exports = createRunOncePlugin(withPodverseCarPlay, 'podverse-carplay-scene', '1.0.0');
