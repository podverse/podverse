/**
 * Repair iOS SplashScreen.storyboard after `expo-splash-screen`.
 *
 * Expo's `applyImageToSplashScreenXML` calls `ensureUniquePush(mainView.subviews[0].imageView, …)`.
 * When an existing storyboard has empty `<subviews/>` (no `imageView` key), that array is
 * `undefined` and the push no-ops — leaving constraints + assets but no logo ImageView. Cold
 * start then shows a blank black (or white) flash with no wordmark.
 *
 * This plugin runs after `expo-splash-screen` and rewrites a known-good storyboard that references
 * `SplashScreenLogo` (written by Expo into Images.xcassets) on a black background.
 */
const fs = require('fs');
const path = require('path');

const { createRunOncePlugin, withDangerousMod } = require('expo/config-plugins');

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

function withPodverseSplashScreen(config) {
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

module.exports = createRunOncePlugin(withPodverseSplashScreen, 'withPodverseSplashScreen', '1.0.0');
