'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { AdminTextField } from '@/components/adminUi/AdminTextField';

type FontOption = { family: string; category?: string };

type FontResponse = { fonts?: FontOption[]; live?: boolean; error?: string };

const FALLBACK_OPTIONS: FontOption[] = [{ family: 'Gilroy' }, { family: 'Roboto' }];

const GoogleFontField: TextFieldClientComponent = ({ field, path }) => {
  const { label, required } = field;
  const { value, setValue, showError, errorMessage } = useField<string>({ path });
  const [options, setOptions] = useState<FontOption[]>(FALLBACK_OPTIONS);
  const [loadedLive, setLoadedLive] = useState(false);
  const [error, setError] = useState('');
  const current = typeof value === 'string' ? value : '';
  const datalistId = useMemo(() => `${path.replace(/[^a-zA-Z0-9_-]/g, '-')}-google-fonts`, [path]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch('/api/google-fonts', { credentials: 'include' });
        if (!res.ok) return;
        const body = (await res.json()) as FontResponse;
        if (!alive) return;
        if (Array.isArray(body.fonts) && body.fonts.length > 0) setOptions(body.fonts);
        setLoadedLive(Boolean(body.live));
        setError(body.error ?? '');
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Google Fonts indisponible');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AdminTextField
      description={
        loadedLive
          ? 'Catalogue Google Fonts chargé.'
          : `Saisie libre avec suggestions locales${error ? ` (${error})` : ''}.`
      }
      errorMessage={errorMessage}
      fontFamilyPreview={current ? `${current}, ui-sans-serif, system-ui, sans-serif` : undefined}
      inputProps={{
        autoComplete: 'off',
        list: datalistId,
        onChange: (event) => setValue(event.target.value),
        placeholder: 'Roboto',
        spellCheck: false,
        value: current,
      }}
      label={label}
      path={path}
      required={required}
      showError={showError}
      suggestions={
        <datalist id={datalistId}>
          {options.map((font) => (
            <option key={font.family} value={font.family} label={font.category ?? font.family} />
          ))}
        </datalist>
      }
    />
  );
};

export default GoogleFontField;
