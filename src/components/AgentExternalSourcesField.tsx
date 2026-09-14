'use client';

import React, { useEffect, useState } from 'react';
import { SelectInput, useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

import { adminGet } from '@/lib/adminFetch';

type Option = { label: string; value: string };

/**
 * Picker for `agentExternalSources`. MCP sources are a runtime registry, not a
 * collection, so options come from `GET /api/agent-sources`; with none
 * configured the field renders nothing rather than an empty control.
 */
const AgentExternalSourcesField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const [options, setOptions] = useState<Option[]>([]);
  const { setValue, value } = useField<string[]>({ path });

  useEffect(() => {
    let alive = true;
    void adminGet('/api/agent-sources').then(({ ok, data }) => {
      if (!alive || !ok || !Array.isArray(data.sources)) return;
      setOptions(
        data.sources
          .filter((source: { kind?: string }) => source.kind === 'external')
          .map((source: { id: string; label: string }) => ({
            label: source.label,
            value: source.id,
          })),
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  if (options.length === 0) return null;

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
      options={options}
      path={path}
      readOnly={readOnly}
      value={Array.isArray(value) ? value : []}
    />
  );
};

export default AgentExternalSourcesField;
