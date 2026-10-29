'use client';

import type { JSX } from 'react';

import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import type { AddByRSSRemoteItemRow } from '../../../hooks/useAddByRSSRemoteItemList';
import { Link } from '../../Link/Link';

import podrollStyles from '../../../styles/components/Content/Podroll/ContentPodroll.module.scss';
import channelStyles from '../../../styles/components/Content/Podroll/ContentPodrollChannelRow.module.scss';
import itemStyles from '../../../styles/components/Content/Podroll/ContentPodrollItemRow.module.scss';

type AddByRSSRemoteItemListProps = {
  rows: AddByRSSRemoteItemRow[];
  openReference: (row: Extract<AddByRSSRemoteItemRow, { kind: 'reference' }>) => Promise<void>;
  openingKey: string | null;
  errorMessage: string | null;
};

const RowBody = ({ row }: { row: AddByRSSRemoteItemRow }): JSX.Element => {
  const styles = row.isItemRef ? itemStyles : channelStyles;
  return (
    <>
      <SkeletonFlashImage
        className={styles.image}
        candidates={row.imageUrl === null ? [] : [row.imageUrl]}
        alt={row.title}
        width={IMAGES.PODROLL.SQUARE.SIZE}
        height={IMAGES.PODROLL.SQUARE.SIZE}
      />
      <div className={styles.textWrapper}>
        <div className={styles.title}>{row.title}</div>
        {row.isItemRef && row.subtitle !== null ? (
          <div className={styles.subtitle}>{row.subtitle}</div>
        ) : null}
      </div>
    </>
  );
};

const RemoteItemRow = ({
  row,
  openReference,
  openingKey,
}: {
  row: AddByRSSRemoteItemRow;
  openReference: AddByRSSRemoteItemListProps['openReference'];
  openingKey: string | null;
}): JSX.Element => {
  const styles = row.isItemRef ? itemStyles : channelStyles;
  return (
    <div className={styles.row}>
      {row.kind === 'reference' ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => {
            void openReference(row);
          }}
          aria-busy={openingKey === row.key}
          disabled={openingKey !== null}
        >
          <RowBody row={row} />
        </button>
      ) : (
        <Link className={styles.link} href={row.href} color="secondary">
          <RowBody row={row} />
        </Link>
      )}
    </div>
  );
};

export function AddByRSSRemoteItemList({
  rows,
  openReference,
  openingKey,
  errorMessage,
}: AddByRSSRemoteItemListProps): JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }

  return (
    <>
      <div className={podrollStyles.listView} data-testid="add-by-rss-remote-item-list">
        {rows.map((row) => (
          <RemoteItemRow
            key={row.key}
            row={row}
            openReference={openReference}
            openingKey={openingKey}
          />
        ))}
      </div>
      {errorMessage !== null ? <p role="alert">{errorMessage}</p> : null}
    </>
  );
}
