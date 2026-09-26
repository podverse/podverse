import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import { Dimensions, PixelRatio, Platform } from 'react-native';

import {
  androidDeviceType,
  errorLogDeviceFields,
  iosDeviceType,
  joinDeviceModel,
} from './errorLogDeviceContext';
import type { ErrorLogDeviceField } from './errorLogDeviceContext';

const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') {
    return null;
  }
  return trimmed;
};

const readModel = (width: number, height: number): { deviceType: string; model: string | null } => {
  if (Platform.OS === 'ios') {
    return {
      deviceType: iosDeviceType(Platform.constants.interfaceIdiom),
      model: null,
    };
  }
  if (Platform.OS === 'android') {
    return {
      deviceType: androidDeviceType(Platform.constants.uiMode, width, height),
      model: joinDeviceModel(Platform.constants.Manufacturer, Platform.constants.Model),
    };
  }
  return { deviceType: 'unknown', model: null };
};

const readOs = (): { androidApiLevel: number | null; osName: string; osVersion: string } => {
  if (Platform.OS === 'ios') {
    return {
      androidApiLevel: null,
      osName: Platform.constants.systemName,
      osVersion: Platform.constants.osVersion,
    };
  }
  if (Platform.OS === 'android') {
    return {
      androidApiLevel: Platform.constants.Version,
      osName: 'Android',
      osVersion: Platform.constants.Release,
    };
  }
  return {
    androidApiLevel: null,
    osName: Platform.OS,
    osVersion: String(Platform.Version),
  };
};

const readAppBuild = (): string | null => {
  if (Platform.OS === 'ios') {
    return emptyToNull(Constants.platform?.ios?.buildNumber);
  }
  if (Platform.OS === 'android') {
    const versionCode = Constants.platform?.android?.versionCode;
    return typeof versionCode === 'number' ? String(versionCode) : null;
  }
  return null;
};

/** Platform facts for the error-detail device section and for copy / email. */
export const readErrorLogDeviceContext = (appLocale: string): ErrorLogDeviceField[] => {
  const window = Dimensions.get('window');
  const { deviceType, model } = readModel(window.width, window.height);
  const os = readOs();
  const deviceLocale = getLocales()[0]?.languageTag ?? '-';

  return errorLogDeviceFields({
    ...os,
    appBuild: readAppBuild(),
    appLocale,
    appVersion: Constants.expoConfig?.version ?? '-',
    deviceLocale,
    deviceType,
    fontScale: PixelRatio.getFontScale(),
    model,
    runtime: Constants.debugMode ? 'debug' : 'release',
    screenHeight: window.height,
    screenScale: PixelRatio.get(),
    screenWidth: window.width,
  });
};
