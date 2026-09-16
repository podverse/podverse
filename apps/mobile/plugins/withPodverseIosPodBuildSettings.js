/**
 * Insert a CocoaPods post_install hook that applies the pod build settings Xcode 27 requires
 * (IPHONEOS_DEPLOYMENT_TARGET floor, implicit Swift modules). The app platform stays 15.1 via the
 * Expo Podfile template / expo-build-properties, and the app target keeps explicit modules.
 *
 * The hook body lives in ios-pod-build-settings.rb so the same snippet can be applied to an
 * already-generated Podfile by scripts/mobile/ensure-ios-pod-build-settings.sh.
 */
const fs = require('fs');
const path = require('path');

const { createRunOncePlugin, withDangerousMod } = require('expo/config-plugins');

// Matches any generated block this repo owns, so an edited snippet replaces the installed one.
const GENERATED_BLOCK =
  /[ \t]*# @generated begin podverse-ios-[\w-]+[\s\S]*?# @generated end podverse-ios-[\w-]+\n?/g;

const RESOURCE_BUNDLE_LOOP_END =
  "          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'\n" +
  '        end\n' +
  '      end\n' +
  '    end\n';

const readSnippet = () =>
  fs.readFileSync(path.join(__dirname, 'ios-pod-build-settings.rb'), 'utf8').trimEnd();

const applySnippet = (podfile) => {
  const stripped = podfile.replace(GENERATED_BLOCK, '');
  if (!stripped.includes(RESOURCE_BUNDLE_LOOP_END)) {
    throw new Error(
      'withPodverseIosPodBuildSettings: Podfile is missing the Expo resource-bundle post_install loop'
    );
  }
  return stripped.replace(
    RESOURCE_BUNDLE_LOOP_END,
    `${RESOURCE_BUNDLE_LOOP_END}\n    ${readSnippet()}\n`
  );
};

const withPodverseIosPodBuildSettings = (config) => {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      const original = fs.readFileSync(podfilePath, 'utf8');
      const next = applySnippet(original);
      if (next !== original) {
        fs.writeFileSync(podfilePath, next);
      }
      return modConfig;
    },
  ]);
};

module.exports = createRunOncePlugin(
  withPodverseIosPodBuildSettings,
  'podverse-ios-pod-build-settings',
  '1.0.0'
);
