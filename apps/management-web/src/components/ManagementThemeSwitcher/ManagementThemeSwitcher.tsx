'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { FormDropdown } from '@podverse/ui';

import { writeCookie } from '../../utils/cookie';
import type { UITheme } from '../../utils/uiTheme';
import { getValidThemes, toUITheme, UI_THEME_COOKIE } from '../../utils/uiTheme';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ManagementThemeSwitcherProps = {
  className?: string;
  id?: string;
  /** Visible field label; defaults to web-aligned `settings.ui_theme.theme`. */
  label?: string;
  /** Override option labels; defaults to `settings.ui_theme.{dark|light|...}`. */
  optionLabel?: (theme: UITheme) => string;
};

export const ManagementThemeSwitcher = ({
  id,
  className,
  label,
  optionLabel,
}: ManagementThemeSwitcherProps) => {
  const t = useTranslations('settings');
  const [theme, setTheme] = useState<UITheme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-ui-theme');
    setTheme(toUITheme(current));
  }, []);

  const options = useMemo(
    () =>
      getValidThemes().map((tr) => ({
        value: tr,
        label: optionLabel !== undefined ? optionLabel(tr) : t(`ui_theme.${tr}`),
      })),
    [optionLabel, t]
  );

  const handleChange = (next: string) => {
    const uiTheme = toUITheme(next);
    document.documentElement.setAttribute('data-ui-theme', uiTheme);
    writeCookie(UI_THEME_COOKIE, uiTheme, COOKIE_MAX_AGE);
    setTheme(uiTheme);
  };

  return (
    <FormDropdown
      className={className}
      id={id ?? 'management-theme-switcher'}
      label={label ?? t('ui_theme.theme')}
      options={options}
      value={theme}
      onChange={handleChange}
    />
  );
};
