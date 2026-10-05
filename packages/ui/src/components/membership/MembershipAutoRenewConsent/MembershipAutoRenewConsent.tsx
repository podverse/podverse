'use client';

import { CheckboxField } from '../../form/CheckboxField/CheckboxField';

import styles from './MembershipAutoRenewConsent.module.scss';

export type MembershipAutoRenewConsentProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disclosure: string;
  disabled?: boolean;
};

export function MembershipAutoRenewConsent({
  id,
  checked,
  onChange,
  label,
  disclosure,
  disabled = false,
}: MembershipAutoRenewConsentProps) {
  return (
    <div className={styles.root}>
      <p className={styles.disclosure}>{disclosure}</p>
      <CheckboxField
        id={id}
        name={id}
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
