'use client';

import React, { useEffect, useState } from 'react';
import { SelectInput, useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { AdminNotice } from '@/components/adminUi/AdminSurface';
import { adminGet } from '@/lib/adminFetch';

type Option = { label: string; value: string };

type SourceState = {
  error?: string;
  loaded: boolean;
  options: Option[];
};

/** Runtime MCP-source picker. An empty or invalid registry remains visible. */
const AgentExternalSourcesField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const [state, setState] = useState<SourceState>({ loaded: false, options: [] });
  const { setValue, value } = useField<string[]>({ path });

  useEffect(() => {
    let alive = true;
    void adminGet('/api/agent-sources').then(({ ok, data }) => {
      if (!alive) return;
      if (!ok) {
        setState({
          loaded: true,
          options: [],
          error: data.error || 'Sources externes indisponibles.',
        });
        return;
      }
      setState({
        loaded: true,
        error: typeof data.error === 'string' ? data.error : undefined,
        options: Array.isArray(data.sources)
          ? data.sources.map((source: { id: string; label: string }) => ({
              label: source.label,
              value: source.id,
            }))
          : [],
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state.error) {
    return (
      <AdminNotice variant="error">
        Configuration des sources externes invalide : {state.error}
      </AdminNotice>
    );
  }

  if (state.loaded && state.options.length === 0) {
    return (
      <AdminNotice density="compact" variant="hint">
        Aucune source externe configurée.
      </AdminNotice>
    );
  }

  return (
    <SelectInput
      hasMany
      label={field.label}
      name={path}
      onChange={(selected) =>
        setValue(
          (Array.isArray(selected) ? selected : selected ? [selected] : []).map(
            (option) => option.value,
          ),
        )
      }
      options={state.options}
      path={path}
      readOnly={readOnly || !state.loaded}
      value={Array.isArray(value) ? value : []}
    />
  );
};

export default AgentExternalSourcesField;
