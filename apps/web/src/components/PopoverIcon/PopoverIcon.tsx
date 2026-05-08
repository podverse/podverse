'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { PopoverIcon as PopoverIconUi } from '@podverse/ui';

type PopoverIconProps = {
  text: string;
  ariaLabel?: string;
};

export const PopoverIcon: React.FC<PopoverIconProps> = ({ text, ariaLabel }) => {
  const tMisc = useTranslations('misc');
  return <PopoverIconUi ariaLabel={ariaLabel ?? tMisc('show_help_information')} body={text} />;
};
