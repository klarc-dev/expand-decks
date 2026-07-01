'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FieldError, FieldLabel, useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

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
    <div className="field-type text" style={{ marginBottom: '20px' }}>
      <FieldLabel label={label} required={required} path={path} />
      <input
        type="text"
        list={datalistId}
        value={current}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Roboto"
        spellCheck={false}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '8px 10px',
          border: `1px solid ${showError ? 'var(--theme-error-500)' : 'var(--theme-elevation-150)'}`,
          borderRadius: '4px',
          backgroundColor: 'var(--theme-elevation-0)',
          color: 'var(--theme-text)',
          fontFamily: current ? `${current}, ui-sans-serif, system-ui, sans-serif` : undefined,
          fontSize: '13px',
        }}
      />
      <datalist id={datalistId}>
        {options.map((font) => (
          <option key={font.family} value={font.family} label={font.category ?? font.family} />
        ))}
      </datalist>
      {showError && <FieldError showError={showError} message={errorMessage} path={path} />}
      <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--theme-elevation-500)' }}>
        {loadedLive
          ? 'Catalogue Google Fonts chargé.'
          : `Saisie libre avec suggestions locales${error ? ` (${error})` : ''}.`}
      </p>
    </div>
  );
};

export default GoogleFontField;
