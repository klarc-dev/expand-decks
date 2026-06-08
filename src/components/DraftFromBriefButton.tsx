'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentInfo } from '@payloadcms/ui';

import {
  dashedHintStyle,
  errorBoxStyle,
  mutedTextStyle,
  panelStyle,
  primaryButtonStyle,
} from '@/components/adminUi/styles';

const DraftFromBriefButton: React.FC = () => {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // SSR-safe document id (reading window.location here breaks hydration and
  // the field silently never renders).
  const { id } = useDocumentInfo();

  const isNewDoc = !id;

  const handleGenerate = useCallback(async () => {
    if (!brief.trim() || !id) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/draft-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ presentationId: String(id), brief }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || `Erreur lors de la génération (HTTP ${res.status})`);
        return;
      }

      // Refresh the page to show the populated blocks
      router.refresh();
      // Full reload to ensure block fields re-render with new data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [brief, id, router]);

  // On new documents the feature needs a saved id — keep it discoverable
  // with a hint instead of disappearing entirely.
  if (isNewDoc) {
    return (
      <div style={dashedHintStyle}>
        Enregistrez d&apos;abord la présentation pour pouvoir générer les diapositives avec
        l&apos;IA à partir d&apos;un brief.
      </div>
    );
  }

  return (
    <div style={{ ...panelStyle, padding: '20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <label
          htmlFor="draft-brief"
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: '8px',
            fontSize: '14px',
          }}
        >
          Générer les diapositives avec l&apos;IA
        </label>
        <p style={{ ...mutedTextStyle, marginBottom: '12px', marginTop: 0 }}>
          Décrivez votre présentation et Claude générera les diapositives automatiquement. Les
          diapositives existantes seront remplacées.
        </p>
      </div>

      <textarea
        id="draft-brief"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Ex : Présentation de 10 slides sur le sujet X — introduction, 3 sections principales, chiffres clés, citations, conclusion"
        disabled={loading}
        rows={3}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '4px',
          backgroundColor: 'var(--theme-elevation-0)',
          color: 'var(--theme-text)',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !brief.trim()}
          style={{
            ...primaryButtonStyle(loading),
            padding: '10px 20px',
            cursor: loading || !brief.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {loading ? 'Génération en cours…' : 'Générer les slides'}
        </button>

        {loading && (
          <span style={mutedTextStyle}>
            Claude rédige votre présentation, cela peut prendre 15-30 secondes…
          </span>
        )}
      </div>

      {error && <div style={errorBoxStyle}>{error}</div>}
    </div>
  );
};

export default DraftFromBriefButton;
