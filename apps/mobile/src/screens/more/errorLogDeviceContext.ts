/**
 * Device facts for an error report. The reader in `errorLogDeviceContext.read.ts` fills the
 * snapshot from the platform; this module only turns that snapshot into stable report lines.
 *
 * The name a person gave their phone is not part of the snapshot. OS, device type, and the
 * manufacturer model (when the platform provides one) are what a support report needs.
 */

const ANDROID_TABLET_SHORTEST_DP = 600;

export type ErrorLogDeviceField = {
  key: string;
  value: string;
};

export type ErrorLogDeviceSnapshot = {
  osName: string;
  osVersion: string;
  /** Set on Android. Null on every other platform. */
  androidApiLevel: number | null;
  deviceType: string;
  /** Manufacturer and model, when the platform exposes them. */
  model: string | null;
  appVersion: string;
  appBuild: string | null;
  runtime: string;
  deviceLocale: string;
  appLocale: string;
  screenWidth: number;
  screenHeight: number;
  screenScale: number;
  fontScale: number;
};

export const iosDeviceType = (interfaceIdiom: string): string => {
  switch (interfaceIdiom) {
    case 'phone':
      return 'phone';
    case 'pad':
      return 'tablet';
    case 'tv':
      return 'tv';
    case 'carplay':
      return 'car';
    case 'vision':
      return 'vision';
    case 'mac':
      return 'desktop';
    default:
      return 'unknown';
  }
};

/** `normal` phones and tablets share one Android ui mode, so width separates them. */
export const androidDeviceType = (uiMode: string, width: number, height: number): string => {
  switch (uiMode) {
    case 'watch':
      return 'watch';
    case 'tv':
      return 'tv';
    case 'car':
      return 'car';
    case 'desk':
      return 'desktop';
    default:
      break;
  }
  if (Math.min(width, height) >= ANDROID_TABLET_SHORTEST_DP) {
    return 'tablet';
  }
  return 'phone';
};

export const joinDeviceModel = (manufacturer: string, model: string): string | null => {
  const brand = manufacturer.trim();
  const name = model.trim();
  if (brand === '' && name === '') {
    return null;
  }
  if (name === '') {
    return brand;
  }
  if (brand === '' || name.toLowerCase().startsWith(brand.toLowerCase())) {
    return name;
  }
  return `${brand} ${name}`;
};

const formatScale = (scale: number): string => {
  if (Number.isInteger(scale)) {
    return String(scale);
  }
  return String(Math.round(scale * 100) / 100);
};

const formatScreen = (snapshot: ErrorLogDeviceSnapshot): string => {
  const width = Math.round(snapshot.screenWidth);
  const height = Math.round(snapshot.screenHeight);
  const fontScale = Math.round(snapshot.fontScale * 100) / 100;
  const size = `${width}×${height} @${formatScale(snapshot.screenScale)}x`;
  if (fontScale === 1) {
    return size;
  }
  return `${size} · font ${formatScale(fontScale)}`;
};

const formatOs = (snapshot: ErrorLogDeviceSnapshot): string => {
  if (snapshot.androidApiLevel !== null) {
    return `Android ${snapshot.osVersion} (API ${snapshot.androidApiLevel})`;
  }
  return `${snapshot.osName} ${snapshot.osVersion}`.trim();
};

const formatLocale = (snapshot: ErrorLogDeviceSnapshot): string => {
  if (snapshot.appLocale === '' || snapshot.appLocale === snapshot.deviceLocale) {
    return snapshot.deviceLocale;
  }
  return `${snapshot.deviceLocale} (app ${snapshot.appLocale})`;
};

export const errorLogDeviceFields = (snapshot: ErrorLogDeviceSnapshot): ErrorLogDeviceField[] => {
  const fields: ErrorLogDeviceField[] = [
    { key: 'os', value: formatOs(snapshot) },
    { key: 'device_type', value: snapshot.deviceType },
  ];
  if (snapshot.model !== null && snapshot.model !== '') {
    fields.push({ key: 'model', value: snapshot.model });
  }
  fields.push({ key: 'app_version', value: snapshot.appVersion });
  if (snapshot.appBuild !== null && snapshot.appBuild !== '') {
    fields.push({ key: 'app_build', value: snapshot.appBuild });
  }
  fields.push(
    { key: 'runtime', value: snapshot.runtime },
    { key: 'locale', value: formatLocale(snapshot) },
    { key: 'screen', value: formatScreen(snapshot) }
  );
  return fields;
};
