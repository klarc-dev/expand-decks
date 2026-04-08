'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

const DraftFromBriefButton: React.FC = () => {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Extract presentation ID from the URL: /admin/collections/presentations/{id}
  const id =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/collections/presentations/')[1]?.split('/')[0]
      : undefined;

  const isNewDoc = !id || id === 'create';

  const handleGenerate = useCallback(async () => {
    if (!brief.trim() || !id) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/draft-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ presentationId: id, brief }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la génération');
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

  // Don't show on new documents (must save first)
  if (isNewDoc) return null;

  return (
    <div
      style={{
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        backgroundColor: 'var(--theme-elevation-50)',
      }}
    >
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
        <p
          style={{
            fontSize: '13px',
            color: 'var(--theme-elevation-500)',
            marginBottom: '12px',
            marginTop: 0,
          }}
        >
          Décrivez votre présentation et Claude générera les diapositives automatiquement. Les
          diapositives existantes seront remplacées.
        </p>
      </div>

      <textarea
        id="draft-brief"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Ex : Pitch de 10 slides pour Klarc sur la stratégie PI biotech — présenter l'approche 360° du cabinet, les chiffres clés, 3 témoignages clients et un appel à l'action"
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
            padding: '10px 20px',
            backgroundColor: loading ? 'var(--theme-elevation-200)' : 'var(--theme-success-500)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !brief.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {loading ? 'Génération en cours\u2026' : 'Générer les slides'}
        </button>

        {loading && (
          <span style={{ fontSize: '13px', color: 'var(--theme-elevation-500)' }}>
            Claude rédige votre présentation, cela peut prendre 15-30 secondes\u2026
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: 'var(--theme-error-50)',
            border: '1px solid var(--theme-error-500)',
            borderRadius: '4px',
            color: 'var(--theme-error-500)',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default DraftFromBriefButton;
