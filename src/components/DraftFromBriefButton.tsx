'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, useDocumentInfo } from '@payloadcms/ui';

import {
  dashedHintStyle,
  errorBoxStyle,
  mutedTextStyle,
  panelStyle,
  primaryButtonStyle,
} from '@/components/adminUi/styles';
import { adminPost } from '@/lib/adminFetch';
import { ALL_SPECS } from '@/blocks/spec';

// Layouts the AI can produce, derived from the block-spec SSOT so this list can
// never drift from what the draft route actually supports.
const DRAFTABLE_LAYOUTS = ALL_SPECS.filter(
  (s) => s.aiDraftable && s.promptMeta,
).map((s) => ({ heading: s.promptMeta!.heading, summary: s.promptMeta!.summary }));

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
      const { ok, status, data } = await adminPost('/api/draft-presentation', {
        presentationId: String(id),
        brief,
      });

      if (!ok) {
        setError(data.error || `Erreur lors de la génération (HTTP ${status})`);
        return;
      }

      // Re-hydrate the document form from the server (Payload re-renders the
      // server component and the blocks field picks up the new slides) — no
      // full-page reload, so other unsaved edits in the form survive.
      router.refresh();
      const count = typeof data.slideCount === 'number' ? data.slideCount : undefined;
      toast.success(
        count != null
          ? `${count} diapositive${count > 1 ? 's' : ''} générée${count > 1 ? 's' : ''}.`
          : 'Diapositives générées.',
      );
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

      {/* Native disclosure: collapsed by default, keyboard-operable, no custom
          toggle state. Lists the layouts the AI can produce + how to control it. */}
      <details style={{ marginBottom: '12px' }}>
        <summary
          style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}
        >
          Que peut générer l&apos;IA ?
        </summary>
        <div style={{ ...mutedTextStyle, fontSize: '13px', paddingTop: '8px' }}>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Layouts disponibles</strong> (l&apos;IA choisit le plus adapté à chaque
            diapositive) :
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '18px' }}>
            {DRAFTABLE_LAYOUTS.map((l) => (
              <li key={l.heading}>
                <code>{l.heading}</code> — {l.summary}
              </li>
            ))}
          </ul>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Règles</strong> : commence par une couverture, termine par une clôture ;
            génère 8 à 15 diapositives, ou le nombre exact que vous précisez.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Contrôle précis</strong> : structurez le brief slide par slide avec la syntaxe{' '}
            <code>S1 — Titre…</code>, <code>S2 — …</code> pour fixer l&apos;ordre et le nombre
            exacts.
          </p>
        </div>
      </details>

      <textarea
        id="draft-brief"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder={
          'Ex (narratif) : Présentation de 10 slides sur le lancement du produit X — contexte, problème, solution, chiffres clés, témoignages, prochaines étapes.\n\n' +
          'Ex (slide par slide) :\nS1 — Couverture : « Titre du deck »\nS2 — Section : Le problème\nS3 — Statistiques clés\n…'
        }
        disabled={loading}
        rows={5}
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
