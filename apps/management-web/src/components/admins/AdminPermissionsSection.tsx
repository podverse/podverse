'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FormDropdownOption } from '@podverse/ui';
import {
  Button,
  Checkbox,
  Fieldset,
  FormDropdown,
  FormGroup,
  FormHintText,
  Table,
} from '@podverse/ui';

import {
  listManagementAdminRoles,
  type ManagementAdminRoleItem,
} from '../../lib/requests/adminRoles';
import {
  ADMIN_PERMISSION_RESOURCE_KEYS,
  CREATE_ROLE_NAV_ID,
  CUSTOM_ROLE_SELECTION_ID,
  emptyPermissionState,
  findRoleIdMatchingPermissions,
  type PermissionState,
  permissionStateFromRoleItem,
  rolePermissionScore,
} from './adminPermissionModel';

const CRUD_BITS = [
  { bit: 1, labelKey: 'create' },
  { bit: 2, labelKey: 'read' },
  { bit: 4, labelKey: 'update' },
  { bit: 8, labelKey: 'deletePerm' },
] as const;

const RESOURCE_LABEL_KEYS: Record<(typeof ADMIN_PERMISSION_RESOURCE_KEYS)[number], string> = {
  feeds_crud: 'feeds',
  feed_takedown_reasons_crud: 'takedownReasons',
  admins_crud: 'admins',
  stats_crud: 'stats',
  billing_prices_crud: 'billingPrices',
  bucket_crud: 'bucket',
};

export type AdminPermissionsSectionProps = {
  permissions: PermissionState;
  onPermissionsChange: React.Dispatch<React.SetStateAction<PermissionState>>;
  selectedRoleId: string;
  onSelectedRoleIdChange: (id: string) => void;
  /** When false, only the matrix and bulk shortcuts are shown (role template editor). */
  showRolePicker: boolean;
  /** Return URL for the “Create new template” navigation. */
  createRoleReturnUrl: string;
  /** After roles load, select the highest-permission template and apply it (new admin). */
  bootstrapHighestRole?: boolean;
  /** After roles load, match this permission set to a template or Custom (edit admin). */
  matchInitialPermissions?: PermissionState;
  onRolesReadyChange?: (ready: boolean) => void;
};

export function AdminPermissionsSection({
  permissions,
  onPermissionsChange,
  selectedRoleId,
  onSelectedRoleIdChange,
  showRolePicker,
  createRoleReturnUrl,
  bootstrapHighestRole = false,
  matchInitialPermissions,
  onRolesReadyChange,
}: AdminPermissionsSectionProps) {
  const router = useRouter();
  const tp = useTranslations('admins.permissions');
  const [roleItems, setRoleItems] = useState<ManagementAdminRoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(showRolePicker);
  const [rolePickerReady, setRolePickerReady] = useState(!showRolePicker);
  const bootstrappedRef = useRef(false);

  const applyRoleItem = useCallback(
    (item: ManagementAdminRoleItem) => {
      onPermissionsChange(permissionStateFromRoleItem(item));
      onSelectedRoleIdChange(item.id);
    },
    [onPermissionsChange, onSelectedRoleIdChange]
  );

  useEffect(() => {
    if (!showRolePicker) {
      onRolesReadyChange?.(true);
      return;
    }
    let active = true;
    const run = async () => {
      setLoadingRoles(true);
      try {
        const res = await listManagementAdminRoles();
        if (!active) {
          return;
        }
        setRoleItems(res.roles);
      } finally {
        if (active) {
          setLoadingRoles(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [showRolePicker, onRolesReadyChange]);

  useEffect(() => {
    if (!showRolePicker || loadingRoles || roleItems.length === 0) {
      return;
    }
    if (bootstrappedRef.current) {
      return;
    }
    if (matchInitialPermissions !== undefined) {
      const id = findRoleIdMatchingPermissions(roleItems, matchInitialPermissions);
      onSelectedRoleIdChange(id);
      if (id === CUSTOM_ROLE_SELECTION_ID) {
        onPermissionsChange(matchInitialPermissions);
      } else {
        const item = roleItems.find((r) => r.id === id);
        if (item !== undefined) {
          onPermissionsChange(permissionStateFromRoleItem(item));
        }
      }
      bootstrappedRef.current = true;
      setRolePickerReady(true);
      onRolesReadyChange?.(true);
      return;
    }
    if (bootstrapHighestRole) {
      const best = roleItems.reduce((a, b) =>
        rolePermissionScore(a) >= rolePermissionScore(b) ? a : b
      );
      applyRoleItem(best);
      bootstrappedRef.current = true;
      setRolePickerReady(true);
      onRolesReadyChange?.(true);
    } else {
      setRolePickerReady(true);
      onRolesReadyChange?.(true);
    }
  }, [
    showRolePicker,
    loadingRoles,
    roleItems,
    bootstrapHighestRole,
    matchInitialPermissions,
    onPermissionsChange,
    onSelectedRoleIdChange,
    onRolesReadyChange,
    applyRoleItem,
  ]);

  const toggleCrudBit = useCallback(
    (resource: keyof PermissionState, bit: number) => {
      onSelectedRoleIdChange(CUSTOM_ROLE_SELECTION_ID);
      onPermissionsChange((prev) => ({
        ...prev,
        [resource]: prev[resource] ^ bit,
      }));
    },
    [onPermissionsChange, onSelectedRoleIdChange]
  );

  const selectAllPermissions = useCallback(() => {
    onSelectedRoleIdChange(CUSTOM_ROLE_SELECTION_ID);
    onPermissionsChange({
      feeds_crud: 15,
      feed_takedown_reasons_crud: 15,
      admins_crud: 15,
      stats_crud: 15,
      billing_prices_crud: 15,
      bucket_crud: 15,
    });
  }, [onPermissionsChange, onSelectedRoleIdChange]);

  const clearAllPermissions = useCallback(() => {
    onSelectedRoleIdChange(CUSTOM_ROLE_SELECTION_ID);
    onPermissionsChange(emptyPermissionState());
  }, [onPermissionsChange, onSelectedRoleIdChange]);

  const roleLabel = useCallback(
    (role: ManagementAdminRoleItem) => {
      if (role.is_predefined) {
        return tp(`rolePresetLabels.${role.id}`);
      }
      return role.name ?? role.id;
    },
    [tp]
  );

  const roleDropdownOptions = useMemo((): FormDropdownOption[] => {
    const base: FormDropdownOption[] = roleItems.map((role) => ({
      value: role.id,
      label: roleLabel(role),
    }));
    base.push({ value: CREATE_ROLE_NAV_ID, label: tp('roleCreateNew') });
    if (selectedRoleId === CUSTOM_ROLE_SELECTION_ID) {
      return [{ value: CUSTOM_ROLE_SELECTION_ID, label: tp('roleCustom') }, ...base];
    }
    return base;
  }, [roleItems, roleLabel, selectedRoleId, tp]);

  const onRoleDropdownChange = useCallback(
    (value: string) => {
      if (value === CREATE_ROLE_NAV_ID) {
        router.push(`/admins/roles/new?returnUrl=${encodeURIComponent(createRoleReturnUrl)}`);
        return;
      }
      if (value === CUSTOM_ROLE_SELECTION_ID) {
        onSelectedRoleIdChange(CUSTOM_ROLE_SELECTION_ID);
        return;
      }
      const item = roleItems.find((r) => r.id === value);
      if (item !== undefined) {
        applyRoleItem(item);
      }
    },
    [applyRoleItem, createRoleReturnUrl, onSelectedRoleIdChange, roleItems, router]
  );

  const selectedRoleDescription = useMemo(() => {
    if (!showRolePicker) {
      return null;
    }
    if (selectedRoleId === CUSTOM_ROLE_SELECTION_ID) {
      return tp('roleCustomHint');
    }
    if (selectedRoleId === '' || loadingRoles || !rolePickerReady) {
      return null;
    }
    const item = roleItems.find((r) => r.id === selectedRoleId);
    if (item === undefined) {
      return null;
    }
    if (item.is_predefined) {
      return tp(`rolePresetDescriptions.${item.id}`);
    }
    return tp('customTemplateHint', { name: item.name ?? item.id });
  }, [loadingRoles, roleItems, rolePickerReady, selectedRoleId, showRolePicker, tp]);

  return (
    <Fieldset legend={tp('legend')}>
      {showRolePicker ? (
        <FormGroup layout="inStack">
          <FormDropdown
            disabled={loadingRoles || roleItems.length === 0 || !rolePickerReady}
            eyebrow={tp('roleTemplateLabel')}
            id="admin-permission-role-template"
            info={tp('roleTemplateHint')}
            onChange={onRoleDropdownChange}
            options={roleDropdownOptions}
            value={selectedRoleId !== '' ? selectedRoleId : (roleItems[0]?.id ?? '')}
          />
          {selectedRoleDescription !== null ? (
            <FormHintText>{selectedRoleDescription}</FormHintText>
          ) : null}
          {loadingRoles || !rolePickerReady ? (
            <FormHintText>{tp('loadingRoles')}</FormHintText>
          ) : null}
        </FormGroup>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-base)',
          marginBottom: 'var(--spacing-base)',
        }}
      >
        <Button type="button" variant="secondary" onClick={selectAllPermissions}>
          {tp('selectAll')}
        </Button>
        <Button type="button" variant="secondary" onClick={clearAllPermissions}>
          {tp('clearAll')}
        </Button>
      </div>
      <Table.ScrollContainer>
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>{tp('resource')}</Table.HeaderCell>
              {CRUD_BITS.map((check) => (
                <Table.HeaderCell key={check.bit}>{tp(check.labelKey)}</Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {ADMIN_PERMISSION_RESOURCE_KEYS.map((key) => (
              <Table.Row key={key}>
                <Table.Cell>{tp(RESOURCE_LABEL_KEYS[key])}</Table.Cell>
                {CRUD_BITS.map((check) => (
                  <Table.Cell key={check.bit}>
                    <Checkbox
                      aria-label={`${tp(RESOURCE_LABEL_KEYS[key])}, ${tp(check.labelKey)}`}
                      checked={(permissions[key] & check.bit) !== 0}
                      onChange={() => {
                        toggleCrudBit(key, check.bit);
                      }}
                    />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Table.ScrollContainer>
    </Fieldset>
  );
}
