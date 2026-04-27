'use client';

import { useEffect, useState } from 'react';

import type { UITheme } from '../../utils/uiTheme';
import { getValidThemes, toUITheme, UI_THEME_COOKIE } from '../../utils/uiTheme';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ManagementThemeSwitcherProps = {
  id?: string;
  className?: string;
  ariaLabel?: string;
  /** When set, option text uses this; otherwise the raw theme id is shown. */
  optionLabel?: (theme: UITheme) => string;
};

export const ManagementThemeSwitcher = ({
  id,
  className,
  ariaLabel = 'UI theme',
  optionLabel,
}: ManagementThemeSwitcherProps) => {
  const [theme, setTheme] = useState<UITheme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-ui-theme');
    setTheme(toUITheme(current));
  }, []);

  const handleChange = (next: UITheme) => {
    document.documentElement.setAttribute('data-ui-theme', next);
    document.cookie = `${UI_THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    setTheme(next);
  };

  return (
    <select
      id={id}
      className={className}
      aria-label={ariaLabel}
      value={theme}
      onChange={(e) => handleChange(toUITheme(e.target.value))}
    >
      {getValidThemes().map((t) => (
        <option key={t} value={t}>
          {optionLabel ? optionLabel(t) : t}
        </option>
      ))}
    </select>
  );
};
