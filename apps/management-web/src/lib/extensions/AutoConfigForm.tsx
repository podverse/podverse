'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';

import { type ExtensionConfigFieldMeta, extensionEnvKey } from '@podverse/extensions-sdk';
import { FormDropdown, FormStack, SwitchButton, TextInput } from '@podverse/ui';

type ValidationErrors = Record<string, string>;

type AutoConfigFormProps = {
  configSchemaFields: Record<string, ExtensionConfigFieldMeta>;
  rootSchemaDescription: unknown;
  extensionId: string;
  value: Record<string, unknown>;
  onChange: (nextConfig: Record<string, unknown>) => void;
  onValidationChange?: (errors: ValidationErrors) => void;
};

type SchemaRule = {
  name?: string;
  args?: Record<string, unknown>;
};

type SchemaDescription = {
  allow?: unknown[];
  flags?: {
    only?: boolean;
    presence?: string;
  };
  keys?: Record<string, unknown>;
  rules?: SchemaRule[];
  type?: string;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSchemaDescription(value: unknown): SchemaDescription {
  if (!isObjectRecord(value)) {
    return {};
  }

  const result: SchemaDescription = {};

  const maybeType = value.type;
  if (typeof maybeType === 'string') {
    result.type = maybeType;
  }

  const maybeAllow = value.allow;
  if (Array.isArray(maybeAllow)) {
    result.allow = maybeAllow;
  }

  const maybeFlags = value.flags;
  if (isObjectRecord(maybeFlags)) {
    const flags: NonNullable<SchemaDescription['flags']> = {};
    if (typeof maybeFlags.presence === 'string') {
      flags.presence = maybeFlags.presence;
    }
    if (typeof maybeFlags.only === 'boolean') {
      flags.only = maybeFlags.only;
    }
    result.flags = flags;
  }

  const maybeRules = value.rules;
  if (Array.isArray(maybeRules)) {
    result.rules = maybeRules
      .map((rule) => {
        if (!isObjectRecord(rule)) {
          return null;
        }
        const parsedRule: SchemaRule = {};
        if (typeof rule.name === 'string') {
          parsedRule.name = rule.name;
        }
        if (isObjectRecord(rule.args)) {
          parsedRule.args = rule.args;
        }
        return parsedRule;
      })
      .filter((rule): rule is SchemaRule => rule !== null);
  }

  const maybeKeys = value.keys;
  if (isObjectRecord(maybeKeys)) {
    result.keys = maybeKeys;
  }

  return result;
}

function getFieldDescription(rootSchemaDescription: unknown, fieldName: string): SchemaDescription {
  const rootDescription = toSchemaDescription(rootSchemaDescription);
  const fieldDescription = rootDescription.keys?.[fieldName];
  return toSchemaDescription(fieldDescription);
}

function getRuleArgNumber(description: SchemaDescription, ruleName: string): number | undefined {
  const rule = description.rules?.find((candidate) => candidate.name === ruleName);
  const limit = rule?.args?.limit;
  return typeof limit === 'number' ? limit : undefined;
}

function isPrimitiveOption(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function extractStringSelectOptions(description: SchemaDescription): string[] {
  if (description.type !== 'string' || description.flags?.only !== true) {
    return [];
  }

  const values = description.allow?.filter(isPrimitiveOption) ?? [];

  const unique = new Set<string>();
  for (const value of values) {
    const asString = String(value);
    if (asString !== '') {
      unique.add(asString);
    }
  }

  return Array.from(unique);
}

function fieldErrorsFromValidation(
  rootSchemaDescription: unknown,
  value: Record<string, unknown>
): ValidationErrors {
  const rootDescription = toSchemaDescription(rootSchemaDescription);
  if (!isObjectRecord(rootDescription.keys)) {
    return {};
  }

  const errors: ValidationErrors = {};
  for (const [fieldName, rawFieldDescription] of Object.entries(rootDescription.keys)) {
    const fieldDescription = toSchemaDescription(rawFieldDescription);
    if (fieldDescription.flags?.presence !== 'required') {
      continue;
    }

    const fieldValue = value[fieldName];
    const isMissing =
      fieldValue === undefined ||
      fieldValue === null ||
      (typeof fieldValue === 'string' && fieldValue.trim() === '');

    if (isMissing) {
      errors[fieldName] = 'Required';
    }
  }

  return errors;
}

export function AutoConfigForm({
  configSchemaFields,
  rootSchemaDescription,
  extensionId,
  value,
  onChange,
  onValidationChange,
}: AutoConfigFormProps) {
  const t = useTranslations();
  const tc = useTranslations('common');
  const te = useTranslations('extensions');

  const validationErrors = useMemo(
    () => fieldErrorsFromValidation(rootSchemaDescription, value),
    [rootSchemaDescription, value]
  );

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validationErrors);
    }
  }, [onValidationChange, validationErrors]);

  const updateField = (fieldName: string, fieldValue: unknown) => {
    onChange({
      ...value,
      [fieldName]: fieldValue,
    });
  };

  return (
    <FormStack>
      {Object.entries(configSchemaFields).map(([fieldName, fieldMeta]) => {
        const fieldDescription = getFieldDescription(rootSchemaDescription, fieldName);
        const helpText = fieldMeta.helpKey ? t(fieldMeta.helpKey) : undefined;
        const errorText = validationErrors[fieldName];
        const readOnlyInfo = te('fieldManagedByEnv', {
          envKey: extensionEnvKey(extensionId, fieldName),
        });

        if (!fieldMeta.userEditable) {
          const displayValue = value[fieldName];
          const renderedValue =
            typeof displayValue === 'string' || typeof displayValue === 'number'
              ? String(displayValue)
              : typeof displayValue === 'boolean'
                ? displayValue
                  ? tc('yes')
                  : tc('no')
                : '';

          return (
            <TextInput
              key={fieldName}
              aria-label={t(fieldMeta.labelKey)}
              eyebrow={t(fieldMeta.labelKey)}
              info={helpText ? `${helpText} ${readOnlyInfo}` : readOnlyInfo}
              readOnly
              value={renderedValue}
            />
          );
        }

        if (fieldDescription.type === 'boolean') {
          const checked = value[fieldName] === true;
          return (
            <SwitchButton
              key={fieldName}
              checked={checked}
              helpAriaLabel={te('fieldHelpAriaLabel', { label: t(fieldMeta.labelKey) })}
              helpText={helpText ?? ''}
              label={t(fieldMeta.labelKey)}
              stateOffLabel={tc('no')}
              stateOnLabel={tc('yes')}
              onChange={(next) => {
                updateField(fieldName, next);
              }}
            />
          );
        }

        const stringSelectOptions = extractStringSelectOptions(fieldDescription);
        if (stringSelectOptions.length > 0) {
          const currentValue = typeof value[fieldName] === 'string' ? value[fieldName] : '';
          const options = [
            ...(fieldDescription.flags?.presence === 'required'
              ? []
              : [{ label: tc('none'), value: '' }]),
            ...stringSelectOptions.map((optionValue) => ({
              label: optionValue,
              value: optionValue,
            })),
          ];

          return (
            <FormDropdown
              key={fieldName}
              ariaLabel={t(fieldMeta.labelKey)}
              eyebrow={t(fieldMeta.labelKey)}
              id={`extension-config-${fieldName}`}
              info={errorText ?? helpText}
              options={options}
              value={currentValue}
              onChange={(nextValue) => {
                updateField(fieldName, nextValue);
              }}
            />
          );
        }

        if (fieldDescription.type === 'number') {
          const currentRaw = value[fieldName];
          const currentValue =
            typeof currentRaw === 'number'
              ? String(currentRaw)
              : typeof currentRaw === 'string'
                ? currentRaw
                : '';

          return (
            <TextInput
              key={fieldName}
              aria-label={t(fieldMeta.labelKey)}
              eyebrow={t(fieldMeta.labelKey)}
              info={helpText}
              infoError={errorText}
              max={getRuleArgNumber(fieldDescription, 'max')}
              min={getRuleArgNumber(fieldDescription, 'min')}
              numberStepperAriaLabels={{
                decrement: te('numberStepDecrement'),
                increment: te('numberStepIncrement'),
              }}
              required={fieldDescription.flags?.presence === 'required'}
              step={fieldDescription.rules?.some((rule) => rule.name === 'integer') ? 1 : 0.01}
              type="number"
              value={currentValue}
              onChange={(event) => {
                const nextText = event.target.value;
                if (nextText === '') {
                  updateField(fieldName, '');
                  return;
                }
                const nextNumber = Number(nextText);
                updateField(fieldName, Number.isFinite(nextNumber) ? nextNumber : nextText);
              }}
            />
          );
        }

        const currentValue = typeof value[fieldName] === 'string' ? value[fieldName] : '';

        return (
          <TextInput
            key={fieldName}
            aria-label={t(fieldMeta.labelKey)}
            eyebrow={t(fieldMeta.labelKey)}
            info={
              fieldMeta.secret
                ? helpText
                  ? `${helpText} ${te('leaveBlankToKeepCurrentSecret')}`
                  : te('leaveBlankToKeepCurrentSecret')
                : helpText
            }
            infoError={errorText}
            required={fieldDescription.flags?.presence === 'required'}
            type={fieldMeta.secret ? 'password' : 'text'}
            value={currentValue}
            onChange={(event) => {
              updateField(fieldName, event.target.value);
            }}
          />
        );
      })}
    </FormStack>
  );
}
