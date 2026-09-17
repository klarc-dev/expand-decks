'use client';
// fallow-ignore-file unused-file -- referenced by Payload's generated admin import map

import React, { useEffect } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { AdminTextField } from '@/components/adminUi/AdminTextField';

/**
 * The field stays in Payload's form tree for validation and submission, but
 * is visually moved into the document-controls row by scoped admin CSS.
 * Keeping the actual field here avoids duplicating form state in a separate
 * header component.
 */
const TitleField: TextFieldClientComponent = () => {
  useEffect(() => {
    // Payload renders the document header as a sibling before the collection
    // edit view, so it cannot be presentation-scoped with a descendant CSS
    // selector. Hide that author-irrelevant Edit/API navigation while this
    // presentation field is mounted, then restore it on navigation.
    const documentHeader = document.querySelector<HTMLElement>('.doc-header');
    if (!documentHeader) return;
    const previousDisplay = documentHeader.style.display;
    documentHeader.style.display = 'none';
    return () => {
      documentHeader.style.display = previousDisplay;
    };
  }, []);

  return null;
};

export const PresentationTitleControl: React.FC = () => {
  const { errorMessage, setValue, showError, value } = useField<string>({ path: 'title' });

  return (
    <div className="presentation-title-control">
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
        label="Titre"
        labelVisibility="screen-reader"
        margin="none"
        path="title"
        required
        showError={showError}
      />
    </div>
  );
};

export default TitleField;
