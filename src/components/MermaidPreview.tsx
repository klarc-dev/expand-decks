'use client';

import React, { useEffect, useId, useState } from 'react';

import { buildMermaidConfig } from '@/export/mermaidConfig';

let initialized = false;

export function MermaidPreview({ source }: { source: string }) {
  const reactId = useId();
  const id = `k-mermaid-preview-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!initialized) {
          mermaid.initialize(buildMermaidConfig());
          initialized = true;
        }
        const result = await mermaid.render(id, source);
        if (!cancelled) setSvg(result.svg);
      } catch {
        if (!cancelled) setSvg('');
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [id, source]);

  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
