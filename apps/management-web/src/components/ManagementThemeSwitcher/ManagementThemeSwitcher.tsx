'use client';

import { useEffect, useMemo, useState } from 'react';

import { FormDropdown } from '@podverse/ui';

import type { UITheme } from '../../utils/uiTheme';
import { getValidThemes, toUITheme, UI_THEME_COOKIE } from '../../utils/uiTheme';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ManagementThemeSwitcherProps = {
  className?: string;
  id?: string;
  /** Visible field label; same pattern as web `FormDropdown` on Settings General. */
  label?: string;
  /** When set, option text uses this; otherwise the raw theme id is shown. */
  optionLabel?: (theme: UITheme) => string;
};

export const ManagementThemeSwitcher = ({
  id,
  className,
  label,
  optionLabel,
}: ManagementThemeSwitcherProps) => {
  const [theme, setTheme] = useState<UITheme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-ui-theme');
    setTheme(toUITheme(current));
  }, []);

  const options = useMemo(
    () =>
      getValidThemes().map((t) => ({
        value: t,
        label: optionLabel ? optionLabel(t) : t,
      })),
    [optionLabel]
  );

  const handleChange = (next: string) => {
    const uiTheme = toUITheme(next);
    document.documentElement.setAttribute('data-ui-theme', uiTheme);
    document.cookie = `${UI_THEME_COOKIE}=${uiTheme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setTheme(uiTheme);
  };

  return (
    <FormDropdown
      className={className}
      id={id ?? 'management-theme-switcher'}
      label={label}
      options={options}
      value={theme}
      onChange={handleChange}
    />
  );
};
