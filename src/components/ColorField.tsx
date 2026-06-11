'use client';

import React, { useCallback } from 'react';
import { FieldError, FieldLabel, useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

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
    <div className="field-type text" style={{ marginBottom: '20px' }}>
      <FieldLabel label={label} required={required} path={path} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="color"
          aria-label={`${typeof label === 'string' ? label : 'Couleur'} — sélecteur`}
          value={swatch}
          onChange={handleSwatch}
          style={{
            width: '40px',
            height: '36px',
            padding: '2px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '4px',
            backgroundColor: 'var(--theme-elevation-0)',
            cursor: 'pointer',
            flex: '0 0 auto',
          }}
        />
        <input
          type="text"
          value={current}
          onChange={handleText}
          placeholder="#02585c"
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: '1 1 auto',
            padding: '8px 10px',
            border: `1px solid ${showError ? 'var(--theme-error-500)' : 'var(--theme-elevation-150)'}`,
            borderRadius: '4px',
            backgroundColor: 'var(--theme-elevation-0)',
            color: 'var(--theme-text)',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}
        />
      </div>
      {showError && <FieldError showError={showError} message={errorMessage} path={path} />}
      {field.admin?.description && typeof field.admin.description === 'string' && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '13px',
            color: 'var(--theme-elevation-500)',
          }}
        >
          {field.admin.description}
        </p>
      )}
    </div>
  );
};

export default ColorField;
