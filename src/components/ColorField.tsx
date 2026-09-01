'use client';

import React, { useCallback } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { AdminTextField } from '@/components/adminUi/AdminTextField';

import './ColorField.scss';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Color picker field for hex `text` fields. Renders a native color swatch
 * (`<input type="color">`) wired bidirectionally to a hex text input through
 * Payload's `useField`, so authors can pick visually or paste a hex code.
 *
 * The field-level `validate` in the collection config (HEX_RE) remains the
 * source of truth for save-time validation; the swatch only ever emits valid
 * `#rrggbb`, and the text input normalises to lowercase.
 */
const ColorField: TextFieldClientComponent = ({ field, path }) => {
  const { label, required } = field;
  const { value, setValue, showError, errorMessage } = useField<string>({ path });

  const current = typeof value === 'string' ? value : '';
  // The native swatch requires a valid #rrggbb; fall back so it never renders empty.
  const swatch = HEX_RE.test(current) ? current : '#000000';

  const handleSwatch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value.toLowerCase()),
    [setValue],
  );

  const handleText = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value.trim();
      setValue(next.toLowerCase());
    },
    [setValue],
  );

  return (
    <AdminTextField
      leadingControl={
        <input
          type="color"
          aria-label={`${typeof label === 'string' ? label : 'Couleur'} — sélecteur`}
          className="color-field__swatch"
          value={swatch}
          onChange={handleSwatch}
        />
      }
      description={
        typeof field.admin?.description === 'string' ? field.admin.description : undefined
      }
      errorMessage={errorMessage}
      inputProps={{
        autoComplete: 'off',
        onChange: handleText,
        placeholder: '#02585c',
        spellCheck: false,
        value: current,
      }}
      inputVariant="code"
      label={label}
      path={path}
      required={required}
      showError={showError}
    />
  );
};

export default ColorField;
