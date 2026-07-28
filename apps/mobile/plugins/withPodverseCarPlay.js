/**
 * Expo config plugin: wire CarPlay scene connection through AppDelegate without putting a
 * CarPlay-only `UIApplicationSceneManifest` in Info.plist.
 *
 * Why: declaring `UIApplicationSceneManifest` with only
 * `CPTemplateApplicationSceneSessionRoleApplication` (or even with a bare phone window scene and
 * no SceneDelegate) suppresses the default phone `UIWindowScene`. Then React Native's
 * `RCTKeyWindow()` returns nil → `RNCSafeAreaProvider` / Dimensions crash with
 * `Cannot read property 'width' of undefined` → black phone screen.
 *
 * CarPlay audio entitlement + App Group stay in `app.config.ts` entitlements. The Swift
 * `PodverseCarPlaySceneDelegate` remains the scene delegate class; this plugin teaches
 * AppDelegate to return that configuration when iOS connects a CarPlay session.
 *
 * REGRESSION GUARD — do NOT reintroduce a CarPlay-only `UIApplicationSceneManifest`:
 * app-closed CarPlay is proven with this dynamic path (2026-07-28: phone force-quit → tap Podverse
 * on CarPlay Home → app cold-launches, App Group cache read, root template renders). The
 * `com.apple.developer.carplay-audio` entitlement — not a scene manifest — registers the CarPlay
 * Home icon and triggers cold-launch, so a manifest is unnecessary AND harmful (it suppresses the
 * phone `UIWindowScene` → black screen). If a future SDK needs a manifest, it MUST also declare the
 * phone `UIWindowScene` (dual-scene) — see `.llm/plans/completed/mobile-carplay-app-closed-scene/`.
 */
const {
  withAppDelegate,
  createRunOncePlugin,
} = require('expo/config-plugins');

const MARKER_BEGIN = '// @generated begin podverse-carplay-scene';
const MARKER_END = '// @generated end podverse-carplay-scene';

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
  if ([super respondsToSelector:@selector(application:configurationForConnectingSceneSession:options:)]) {
    return [super application:application
        configurationForConnectingSceneSession:connectingSceneSession
                                       options:options];
  }
  return [[UISceneConfiguration alloc] initWithName:@"Default Configuration"
                                        sessionRole:connectingSceneSession.role];
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
    // Insert before @end
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
