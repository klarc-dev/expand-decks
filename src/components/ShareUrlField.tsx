'use client';

import React, { useCallback, useState } from 'react';
import { useDocumentInfo } from '@payloadcms/ui';

/**
 * Reveal-on-demand share URL. The raw token is never stored (only its
 * SHA-256), so the URL cannot be displayed after the fact — instead this
 * button rotates the token server-side and shows the fresh URL once.
 */
const ShareUrlField: React.FC = () => {
  const { id } = useDocumentInfo();
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const res = await fetch(`/api/share-links/${id}/rotate`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la génération du lien');
        return;
      }
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL stays selectable in the input.
    }
  }, [shareUrl]);

  if (!id) {
    return (
      <div
        style={{
          padding: '12px 16px',
          marginBottom: '20px',
          border: '1px dashed var(--theme-elevation-150)',
          borderRadius: '4px',
          color: 'var(--theme-elevation-500)',
          fontSize: '13px',
        }}
      >
        Enregistrez d&apos;abord le lien de partage, puis générez l&apos;URL à transmettre.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        backgroundColor: 'var(--theme-elevation-50)',
      }}
    >
      <label
        style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}
      >
        URL de partage
      </label>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--theme-elevation-500)',
          marginTop: 0,
          marginBottom: '12px',
        }}
      >
        Le jeton n&apos;est jamais stocké en clair : l&apos;URL n&apos;est visible qu&apos;au
        moment de sa génération. Générer une nouvelle URL invalide la précédente.
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading
              ? 'var(--theme-elevation-200)'
              : 'var(--theme-success-500)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          {loading ? 'Génération…' : shareUrl ? 'Régénérer l’URL' : 'Générer l’URL de partage'}
        </button>

        {shareUrl && (
          <>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              style={{
                flex: '1 1 320px',
                padding: '8px 10px',
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: '4px',
                backgroundColor: 'var(--theme-elevation-0)',
                color: 'var(--theme-text)',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--theme-elevation-100)',
                color: 'var(--theme-text)',
                border: '1px solid var(--theme-elevation-150)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </>
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

export default ShareUrlField;
