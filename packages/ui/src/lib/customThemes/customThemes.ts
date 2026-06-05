export type RemoteThemeLabelMap = Record<string, string>;

export type RemoteThemeDefinition = {
  id: string;
  cssVariables: Record<string, string>;
  labels?: RemoteThemeLabelMap;
};

export type RemoteThemePack = {
  version: string;
  themes: RemoteThemeDefinition[];
};

export { isAllowedCustomThemesUrl } from '@podverse/helpers-config';

const THEME_ID_PATTERN = /^[a-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseThemeLabels(value: unknown): RemoteThemeLabelMap | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const labels: RemoteThemeLabelMap = {};
  for (const [locale, rawLabel] of Object.entries(value)) {
    if (!isNonEmptyString(locale) || !isNonEmptyString(rawLabel)) {
      return undefined;
    }
    labels[locale] = rawLabel;
  }
  return labels;
}

function parseThemeCssVariables(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const cssVariables: Record<string, string> = {};
  for (const [cssVarName, rawCssVarValue] of Object.entries(value)) {
    if (!cssVarName.startsWith('--') || !isNonEmptyString(rawCssVarValue)) {
      return undefined;
    }
    cssVariables[cssVarName] = rawCssVarValue;
  }
  if (Object.keys(cssVariables).length === 0) {
    return undefined;
  }
  return cssVariables;
}

function parseThemeDefinition(value: unknown): RemoteThemeDefinition | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = value.id;
  if (!isNonEmptyString(id)) {
    return undefined;
  }
  const normalizedId = id.trim().toLowerCase();
  if (!THEME_ID_PATTERN.test(normalizedId)) {
    return undefined;
  }
  const cssVariables = parseThemeCssVariables(value.cssVariables);
  if (cssVariables === undefined) {
    return undefined;
  }
  const labels = parseThemeLabels(value.labels);
  if (value.labels !== undefined && labels === undefined) {
    return undefined;
  }
  return {
    id: normalizedId,
    cssVariables,
    labels,
  };
}

export function parseRemoteThemePack(value: unknown): RemoteThemePack | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const version = value.version;
  if (!isNonEmptyString(version)) {
    return undefined;
  }

  const rawThemes = value.themes;
  if (!Array.isArray(rawThemes) || rawThemes.length === 0) {
    return undefined;
  }

  const themes: RemoteThemeDefinition[] = [];
  const uniqueThemeIds = new Set<string>();

  for (const rawTheme of rawThemes) {
    const theme = parseThemeDefinition(rawTheme);
    if (theme === undefined || uniqueThemeIds.has(theme.id)) {
      return undefined;
    }
    uniqueThemeIds.add(theme.id);
    themes.push(theme);
  }

  return {
    version: version.trim(),
    themes,
  };
}

export function buildCustomThemesCssText(themes: readonly RemoteThemeDefinition[]): string {
  if (themes.length === 0) {
    return '';
  }
  const cssBlocks = themes.map((theme) => {
    const cssDeclarations = Object.entries(theme.cssVariables)
      .map(([key, cssValue]) => `  ${key}: ${cssValue};`)
      .join('\n');
    return `[data-ui-theme='${theme.id}'] {\n${cssDeclarations}\n}`;
  });
  return cssBlocks.join('\n\n');
}
