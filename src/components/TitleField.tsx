'use client';
// fallow-ignore-file unused-file -- referenced by Payload's generated admin import map

import React, { useEffect } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { AdminTextField } from '@/components/adminUi/AdminTextField';

/**
 * The presentation title, edited where the title is read: a heading-sized
 * input at the top of the form. While it is mounted the native document
 * header title is hidden, so the title appears once and is always editable.
 */
const TitleField: TextFieldClientComponent = ({ field, path }) => {
  const { errorMessage, setValue, showError, value } = useField<string>({ path });

  useEffect(() => {
    // Inline style, not the hidden attribute: Payload's `.render-title` sets
    // `display: inline-block`, which would win over the attribute.
    const headerTitle = document.querySelector<HTMLElement>('.doc-header__title');
    if (!headerTitle) return;
    const previous = headerTitle.style.display;
    headerTitle.style.display = 'none';
    return () => {
      headerTitle.style.display = previous;
    };
  }, []);

  return (
    <AdminTextField
      errorMessage={errorMessage}
      inputProps={{
        autoComplete: 'off',
        onChange: (event) => setValue(event.target.value),
        placeholder: 'Titre de la présentation',
        spellCheck: true,
        value: typeof value === 'string' ? value : '',
      }}
      inputVariant="title"
      label={field.label}
      labelVisibility="screen-reader"
      path={path}
      required={field.required}
      showError={showError}
    />
  );
};

export default TitleField;
