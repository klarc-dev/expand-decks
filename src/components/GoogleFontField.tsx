'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { AdminTextField } from '@/components/adminUi/AdminTextField';

type FontOption = { family: string; category?: string };

type FontResponse = { fonts?: FontOption[]; error?: string };

const GoogleFontField: TextFieldClientComponent = ({ field, path }) => {
  const { label, required } = field;
  const { value, setValue, showError, errorMessage } = useField<string>({ path });
  const [options, setOptions] = useState<FontOption[]>([]);
  const [error, setError] = useState('');
  const current = typeof value === 'string' ? value : '';
  const datalistId = useMemo(() => `${path.replace(/[^a-zA-Z0-9_-]/g, '-')}-google-fonts`, [path]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch('/api/google-fonts', { credentials: 'include' });
        const body = (await res.json()) as FontResponse;
        if (!alive) return;
        if (!res.ok || !Array.isArray(body.fonts) || body.fonts.length === 0) {
          setOptions([]);
          setError(body.error ?? `Catalogue Google Fonts indisponible (HTTP ${res.status}).`);
          return;
        }
        setOptions(body.fonts);
        setError('');
      } catch (err) {
        if (alive) {
          setOptions([]);
          setError(err instanceof Error ? err.message : 'Catalogue Google Fonts indisponible.');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AdminTextField
      description={
        error
          ? `Catalogue indisponible : ${error} Corrigez GOOGLE_FONTS_API_KEY.`
          : `Catalogue Google Fonts chargé (${options.length} familles).`
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
