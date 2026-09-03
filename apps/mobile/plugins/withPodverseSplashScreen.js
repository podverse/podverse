/**
 * Native splash assets after `expo-splash-screen`.
 *
 * iOS: Expo's `applyImageToSplashScreenXML` no-ops when the storyboard has empty `<subviews/>`,
 * leaving a blank launch screen. This rewrite installs a known-good storyboard that shows the
 * wordmark (`SplashScreenLogo`) on black.
 *
 * Android 12+: the system splash is a circular icon, not a full-screen image. Expo `run:android`
 * does not re-run prebuild, so plugin `android.image` never reaches `splashscreen_logo` until
 * prebuild. This copies the density-correct icon from `assets/splash/android/` so the launch
 * icon is the brand mark, not a circular crop of the wordmark.
 */
const fs = require('fs');
const path = require('path');

const { createRunOncePlugin, withDangerousMod } = require('expo/config-plugins');

const ANDROID_SPLASH_DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

const STORYBOARD = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="32700.99.1234" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="EXPO-VIEWCONTROLLER-1">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="22685"/>
        <capability name="Named colors" minToolsVersion="9.0"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="EXPO-SCENE-1">
            <objects>
                <viewController storyboardIdentifier="SplashScreenViewController" id="EXPO-VIEWCONTROLLER-1" sceneMemberID="viewController">
                    <view key="view" userInteractionEnabled="NO" contentMode="scaleToFill" insetsLayoutMarginsFromSafeArea="NO" id="EXPO-ContainerView" userLabel="ContainerView">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" horizontalHuggingPriority="251" verticalHuggingPriority="251" image="SplashScreenLogo" translatesAutoresizingMaskIntoConstraints="NO" id="EXPO-SplashScreen" userLabel="SplashScreenLogo">
                                <rect key="frame" x="46.5" y="276" width="300" height="300"/>
                            </imageView>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="Rmq-lb-GrQ"/>
                        <constraints>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="centerX" secondItem="EXPO-ContainerView" secondAttribute="centerX" id="podverse-splash-center-x"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="centerY" secondItem="EXPO-ContainerView" secondAttribute="centerY" id="podverse-splash-center-y"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="width" secondItem="EXPO-ContainerView" secondAttribute="width" multiplier="0.76" id="podverse-splash-width"/>
                        </constraints>
                        <color key="backgroundColor" name="SplashScreenBackground"/>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="EXPO-PLACEHOLDER-1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="0.0" y="0.0"/>
        </scene>
    </scenes>
    <resources>
        <image name="SplashScreenLogo" width="300" height="300"/>
        <namedColor name="SplashScreenBackground">
            <color alpha="1.000" blue="0.00000000000000" green="0.00000000000000" red="0.00000000000000" customColorSpace="sRGB" colorSpace="custom"/>
        </namedColor>
    </resources>
</document>
`;

function withIosSplashStoryboard(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const projectName = modConfig.modRequest.projectName;
      if (projectName === undefined || projectName.length === 0) {
        return modConfig;
      }
      const storyboardPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        projectName,
        'SplashScreen.storyboard'
      );
      fs.writeFileSync(storyboardPath, STORYBOARD);
      return modConfig;
    },
  ]);
}

function withAndroidSplashIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const resRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main/res');
      const sourceRoot = path.join(projectRoot, 'assets/splash/android');

      for (const density of ANDROID_SPLASH_DENSITIES) {
        const sourcePath = path.join(sourceRoot, `drawable-${density}`, 'splashscreen_logo.png');
        const destDir = path.join(resRoot, `drawable-${density}`);
        const destPath = path.join(destDir, 'splashscreen_logo.png');
        if (!fs.existsSync(sourcePath)) {
          throw new Error(`Missing Android splash asset: ${sourcePath}`);
        }
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(sourcePath, destPath);
      }

      return modConfig;
    },
  ]);
}

function withPodverseSplashScreen(config) {
  return withAndroidSplashIcon(withIosSplashStoryboard(config));
}

module.exports = createRunOncePlugin(withPodverseSplashScreen, 'withPodverseSplashScreen', '1.1.0');
