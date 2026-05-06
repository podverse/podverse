'use client';

import React from 'react';

import type { DTOAccount } from '@podverse/helpers';
import { Divider } from '@podverse/ui';

import { ListProfileRow } from './ListProfileRow';

import styles from '../../../styles/components/Common/List/ListNodes.module.scss';

interface Params {
  accounts: DTOAccount[];
}

export function ListProfileNodes({ accounts }: Params): React.ReactNode {
  return (
    <div key="list" className={styles.listTight}>
      {accounts.map((account, idx) => (
        <React.Fragment key={account.id}>
          <ListProfileRow account={account} />
          {idx < accounts.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </div>
  );
}
