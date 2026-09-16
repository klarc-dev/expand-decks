'use client';

import React, { useMemo } from 'react';
import { SelectInput, useAllFormFields, useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

type Option = { label: string; value: string };

const BLOCK_TYPE_KEY = /^slides\.(\d+)\.blockType$/;

/** Strip the `[mot]` heading mark so the option reads like the slide outline. */
function plainTitle(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\[([^\]]+)\]/g, '$1').trim() : '';
}

/**
 * Picks a sibling slide for an agenda row. Slides are blocks of the same
 * document, not a collection, so the options come from the live form state and
 * the value is the target block's id: it follows the slide when rows are
 * reordered, and the renderer turns it into a page number at build time.
 */
const SlideTargetField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const [fields] = useAllFormFields();
  const { setValue, value } = useField<string | null>({ path });
  const ownIndex = Number(/^slides\.(\d+)\./.exec(path)?.[1] ?? -1);

  const options = useMemo(() => {
    const rows = (fields.slides?.rows ?? []) as Array<{ id?: string }>;
    const out: Array<Option & { index: number }> = [];
    for (const key of Object.keys(fields)) {
      const match = BLOCK_TYPE_KEY.exec(key);
      if (!match) continue;
      const index = Number(match[1]);
      if (index === ownIndex) continue;
      const rowId = fields[`slides.${index}.id`]?.value ?? rows[index]?.id;
      if (typeof rowId !== 'string' || !rowId) continue;
      const blockType = String(fields[key]?.value ?? '');
      const title = plainTitle(fields[`slides.${index}.title`]?.value);
      out.push({
        index,
        value: rowId,
        label: `${String(index + 1).padStart(2, '0')} · ${title || blockType}`,
      });
    }
    return out.sort((a, b) => a.index - b.index).map(({ index: _index, ...option }) => option);
  }, [fields, ownIndex]);

  const current = typeof value === 'string' ? value : '';
  const known = !current || options.some((option) => option.value === current);
  const allOptions = known
    ? options
    : [...options, { label: 'Diapositive introuvable (supprimée ?)', value: current }];

  return (
    <SelectInput
      isClearable
      label={field.label}
      name={path}
      onChange={(selected) => {
        const option = Array.isArray(selected) ? selected[0] : selected;
        setValue(option?.value ? String(option.value) : null);
      }}
      options={allOptions}
      path={path}
      readOnly={readOnly}
      value={current || undefined}
    />
  );
};

export default SlideTargetField;
