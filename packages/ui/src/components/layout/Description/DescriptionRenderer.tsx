'use client';

import { sanitize } from 'isomorphic-dompurify';
import type { FC } from 'react';
import { useMemo } from 'react';

import styles from './SafeHtmlDescription.module.scss';

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'a',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'br',
];
const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'];

export function isHtmlString(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

export type SafeHtmlDescriptionProps = {
  html: string;
};

export const SafeHtmlDescription: FC<SafeHtmlDescriptionProps> = ({ html }) => {
  const cleanHtml = useMemo(() => {
    return sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      RETURN_TRUSTED_TYPE: false,
      FORCE_BODY: true,
    });
  }, [html]);

  return (
    <div className={styles.safeHtmlDescription} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
  );
};

export type DescriptionRendererProps = {
  description: string;
};

export const DescriptionRenderer: FC<DescriptionRendererProps> = ({ description }) => {
  if (isHtmlString(description)) {
    return <SafeHtmlDescription html={description} />;
  }
  return <p className={styles.safeHtmlDescription}>{description}</p>;
};
