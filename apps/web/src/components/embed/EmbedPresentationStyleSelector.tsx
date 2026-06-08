'use client';

import { useTranslations } from 'next-intl';

import type { EmbedMediaType } from '../../lib/embed/embedTypes';

import styles from '../../styles/components/embed/EmbedPresentationStyleSelector.module.scss';

type EmbedPresentationStyleSelectorProps = {
  value: EmbedMediaType;
  onChange: (nextValue: EmbedMediaType) => void;
};

export function EmbedPresentationStyleSelector({
  value,
  onChange,
}: EmbedPresentationStyleSelectorProps) {
  const t = useTranslations('features');

  return (
    <fieldset className={styles.fieldset} data-testid="embed-presentation-style-selector">
      <legend className={styles.legend}>{t('embed_presentation_style_legend')}</legend>
      <div className={styles.options}>
        <label className={styles.option}>
          <input
            checked={value === 'audio'}
            name="embed-presentation-style"
            onChange={() => onChange('audio')}
            type="radio"
            value="audio"
          />
          <span>{t('embed_presentation_style_audio')}</span>
        </label>
        <label className={styles.option}>
          <input
            checked={value === 'video'}
            name="embed-presentation-style"
            onChange={() => onChange('video')}
            type="radio"
            value="video"
          />
          <span>{t('embed_presentation_style_video')}</span>
        </label>
      </div>
    </fieldset>
  );
}
