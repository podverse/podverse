'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { writeCookie } from '@podverse/helpers-browser';
import { ALL_POSSIBLE_THEMES, FormDropdown } from '@podverse/ui';

import type { UITheme } from '../../utils/uiTheme';
import {
  getCustomThemeById,
  getValidThemes,
  toUITheme,
  UI_THEME_COOKIE,
} from '../../utils/uiTheme';

export type ManagementThemeSwitcherProps = {
  className?: string;
  id?: string;
  /** Visible field title inside the control chrome; defaults to web-aligned `settings.ui_theme.theme`. */
  eyebrow?: string;
  /** Override option labels; defaults to `settings.ui_theme.{dark|light|...}`. */
  optionLabel?: (theme: UITheme) => string;
};

export const ManagementThemeSwitcher = ({
  id,
  className,
  eyebrow,
  optionLabel,
}: ManagementThemeSwitcherProps) => {
  const t = useTranslations('settings');
  const locale = useLocale();
  const [theme, setTheme] = useState<UITheme>('dark');
  const builtInThemes = useMemo(() => new Set<string>(ALL_POSSIBLE_THEMES), []);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-ui-theme');
    setTheme(toUITheme(current));
  }, []);

  const options = useMemo(
    () =>
      getValidThemes().map((tr) => ({
        value: tr,
        label:
          optionLabel !== undefined
            ? optionLabel(tr)
            : (() => {
                if (builtInThemes.has(tr)) {
                  return t(`ui_theme.${tr}`);
                }
                const customTheme = getCustomThemeById(tr);
                if (customTheme?.labels?.[locale]) {
                  return customTheme.labels[locale];
                }
                if (customTheme?.labels?.['en-US']) {
                  return customTheme.labels['en-US'];
                }
                return customTheme?.id ?? tr;
              })(),
      })),
    [builtInThemes, locale, optionLabel, t]
  );

  const handleChange = (next: string) => {
    const uiTheme = toUITheme(next);
    document.documentElement.setAttribute('data-ui-theme', uiTheme);
    writeCookie(UI_THEME_COOKIE, uiTheme);
    setTheme(uiTheme);
  };

  return (
    <FormDropdown
      className={className}
      eyebrow={eyebrow ?? t('ui_theme.theme')}
      id={id ?? 'management-theme-switcher'}
      options={options}
      value={theme}
      onChange={handleChange}
    />
  );
};
