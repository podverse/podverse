'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { InlineTextButton } from '../InlineTextButton/InlineTextButton';

import styles from '../../styles/components/Content/ContentExpandableRows.module.scss';

const CONTENT_SECTION_INITIAL_ROW_LIMIT = 10;

type ContentExpandableRowsProps = {
  rows: ReactNode[];
  rowsClassName?: string;
  initialLimit?: number;
};

export const ContentExpandableRows = ({
  rows,
  rowsClassName,
  initialLimit = CONTENT_SECTION_INITIAL_ROW_LIMIT,
}: ContentExpandableRowsProps) => {
  const tInfo = useTranslations('info');
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return null;
  }

  const shouldTruncate = !expanded && rows.length > initialLimit;
  const rowsToRender = shouldTruncate ? rows.slice(0, initialLimit) : rows;

  return (
    <>
      <div className={rowsClassName}>{rowsToRender}</div>
      {shouldTruncate ? (
        <div className={styles.showMore}>
          <InlineTextButton
            aria-expanded={expanded}
            type="button"
            onClick={() => {
              setExpanded(true);
            }}
          >
            {tInfo('show_more')}
          </InlineTextButton>
        </div>
      ) : null}
    </>
  );
};
