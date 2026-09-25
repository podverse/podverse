'use client';

import { useTranslations } from 'next-intl';
import { FaLink } from 'react-icons/fa6';

import { IconButton } from '../../Media/Header/IconButton';

type ChapterLinkButtonProps = {
  className?: string;
  href: string;
};

export function ChapterLinkButton({ className, href }: ChapterLinkButtonProps) {
  const tMediaPlayer = useTranslations('media_player');
  const label = tMediaPlayer('open_chapter_link');

  return (
    <span className={className} data-testid="media-player-chapter-link">
      <IconButton
        ariaLabel={label}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        title={label}
      >
        <FaLink aria-hidden />
      </IconButton>
    </span>
  );
}
