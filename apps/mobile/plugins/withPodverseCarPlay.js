/**
 * Expo config plugin: wire CarPlay through Swift AppDelegate without requiring a
 * `UIApplicationSceneManifest` override in app config.
 *
 * CarPlay sessions use `PodverseCarPlaySceneDelegate`; phone sessions keep a dedicated
 * scene delegate that re-attaches the existing React Native window to the foreground scene.
 */
const { createRunOncePlugin, withAppDelegate } = require('expo/config-plugins');

const METHOD_MARKER_BEGIN = '// @generated begin podverse-carplay-scene';
const METHOD_MARKER_END = '// @generated end podverse-carplay-scene';
const PHONE_MARKER_BEGIN = '// @generated begin podverse-phone-scene';
const PHONE_MARKER_END = '// @generated end podverse-phone-scene';

const PHONE_SCENE_CLASS = `
${PHONE_MARKER_BEGIN}
private final class PodversePhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let window = appDelegate.window else {
      return
    }

    window.windowScene = windowScene
    window.makeKeyAndVisible()
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    for context in URLContexts {
      _ = appDelegate.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }
}
${PHONE_MARKER_END}
`;

const CARPLAY_METHOD = `
${METHOD_MARKER_BEGIN}
  // CarPlay scene routing stays in AppDelegate so the phone scene remains a normal UIWindowScene.
  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    if connectingSceneSession.role == .carTemplateApplication {
      let configuration = UISceneConfiguration(
        name: "PodverseCarPlay",
        sessionRole: connectingSceneSession.role
      )
      configuration.sceneClass = CPTemplateApplicationScene.self
      configuration.delegateClass = NSClassFromString("PodverseCarPlaySceneDelegate")
      return configuration
    }

    let phoneConfiguration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    phoneConfiguration.delegateClass = PodversePhoneSceneDelegate.self
    return phoneConfiguration
  }
${METHOD_MARKER_END}
`;

const ensureSwiftImport = (contents, importName) => {
  const importLine = `import ${importName}`;
  if (contents.includes(importLine)) {
    return contents;
  }
  const match = contents.match(/^import .*$/m);
  if (match === null || match.index === undefined) {
    return `${importLine}\n${contents}`;
  }
  const insertAt = match.index + match[0].length;
  return `${contents.slice(0, insertAt)}\n${importLine}${contents.slice(insertAt)}`;
};

const findClassRange = (contents, classDeclarationPrefix) => {
  const classIndex = contents.indexOf(classDeclarationPrefix);
  if (classIndex === -1) {
    throw new Error(`withPodverseCarPlay: could not find ${classDeclarationPrefix}`);
  }
  const openBraceIndex = contents.indexOf('{', classIndex);
  if (openBraceIndex === -1) {
    throw new Error('withPodverseCarPlay: could not find AppDelegate class opening brace');
  }

  let depth = 0;
  for (let index = openBraceIndex; index < contents.length; index += 1) {
    const char = contents[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { classIndex, closeBraceIndex: index };
      }
    }
  }
  throw new Error('withPodverseCarPlay: could not find AppDelegate class closing brace');
};

const withPodverseCarPlay = (config) =>
  withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== 'swift') {
      throw new Error(
        `withPodverseCarPlay: expected Swift AppDelegate, got ${modConfig.modResults.language}`
      );
    }

    let contents = modConfig.modResults.contents;
    contents = ensureSwiftImport(contents, 'CarPlay');

    if (!contents.includes(PHONE_MARKER_BEGIN)) {
      const mainIndex = contents.indexOf('@main');
      if (mainIndex === -1) {
        throw new Error('withPodverseCarPlay: could not find @main AppDelegate marker');
      }
      contents = `${contents.slice(0, mainIndex)}${PHONE_SCENE_CLASS}\n${contents.slice(mainIndex)}`;
    }

    if (!contents.includes(METHOD_MARKER_BEGIN)) {
      const { closeBraceIndex } = findClassRange(contents, 'class AppDelegate');
      contents = `${contents.slice(0, closeBraceIndex)}\n${CARPLAY_METHOD}${contents.slice(closeBraceIndex)}`;
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });

module.exports = createRunOncePlugin(withPodverseCarPlay, 'podverse-carplay-scene', '2.0.0');
