'use client';

import React from 'react';
import { FieldLabel } from '@payloadcms/ui';
import type { StaticLabel } from 'payload';

import './AdminTextField.scss';

type AdminTextFieldProps = {
  description?: React.ReactNode;
  errorMessage?: string;
  fontFamilyPreview?: string;
  inputVariant?: 'default' | 'code' | 'compact-edit';
  leadingControl?: React.ReactNode;
  labelVisibility?: 'visible' | 'screen-reader';
  margin?: 'default' | 'none';
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    | 'aria-describedby'
    | 'aria-invalid'
    | 'className'
    | 'id'
    | 'name'
    | 'required'
    | 'style'
    | 'type'
  >;
  label?: StaticLabel;
  path: string;
  required?: boolean;
  showError?: boolean;
  suggestions?: React.ReactElement<React.HTMLAttributes<HTMLDataListElement>, 'datalist'>;
};

function fieldId(path: string) {
  return `field-${path.replace(/\./g, '__')}`;
}

/**
 * Canonical adapter for custom Payload text fields. Payload owns the label
 * appearance; this adapter owns the native input association, helper/error
 * relationship, and shared geometry that custom fields previously rebuilt.
 */
export function AdminTextField({
  description,
  errorMessage,
  fontFamilyPreview,
  inputProps,
  inputVariant = 'default',
  label,
  labelVisibility = 'visible',
  leadingControl,
  margin = 'default',
  path,
  required,
  showError = false,
  suggestions,
}: AdminTextFieldProps) {
  const id = fieldId(path);
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = showError && errorMessage ? `${id}-error` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={`admin-text-field${showError ? ' admin-text-field--error' : ''}`}
      data-input-variant={inputVariant}
      data-margin={margin}
    >
      <div className={labelVisibility === 'screen-reader' ? 'sr-only' : undefined}>
        <FieldLabel htmlFor={id} label={label} required={required} path={path} />
      </div>
      <div className="admin-text-field__control-row">
        {leadingControl}
        <input
          {...inputProps}
          aria-describedby={describedBy}
          aria-invalid={showError || undefined}
          className="admin-text-field__input"
          data-variant={inputVariant}
          id={id}
          name={path}
          required={required}
          style={fontFamilyPreview ? { fontFamily: fontFamilyPreview } : undefined}
          type="text"
        />
      </div>
      {errorId ? (
        <div className="admin-text-field__error" id={errorId}>
          {errorMessage}
        </div>
      ) : null}
      {descriptionId ? (
        <div className="admin-text-field__description" id={descriptionId}>
          {description}
        </div>
      ) : null}
      {suggestions}
    </div>
  );
}
