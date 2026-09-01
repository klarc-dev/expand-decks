type DraftEvent = {
  detail?: unknown;
  phase: string;
};

type DraftEventTime = {
  dateTime: string;
  label: string;
};

type DetailRecord = Record<string, unknown>;

const DRAFT_EVENT_PHASE_LABEL: Record<string, string> = {
  queued: 'Dans la file d’attente…',
  gather: 'Recherche du dossier…',
  structure: 'Plan des diapositives…',
  draft: 'Rédaction des diapositives…',
  validate: 'Critique du contenu…',
  'validate:revise': 'Correction des diapositives signalées…',
  'validate:pass': 'Contenu validé.',
  approval: 'Validation du plan requise.',
  build: 'Build Slidev (rendu réel)…',
  visual: 'Critique visuelle des diapositives rendues…',
  'visual:revise': 'Correction des problèmes visuels…',
  done: 'Terminé.',
  cancelled: 'Annulé.',
  failed: 'Échec.',
};

function isDetailRecord(value: unknown): value is DetailRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countLabel(count: number) {
  return `${count} diapositive${count > 1 ? 's' : ''} à corriger`;
}

export function formatDraftEventPhase(phase: string): string {
  return DRAFT_EVENT_PHASE_LABEL[phase] ?? 'Étape du workflow.';
}

export function formatDraftEventDetail({ detail, phase }: DraftEvent): string | null {
  if (detail === undefined || detail === null || detail === '') return null;

  if (typeof detail === 'string') return detail;

  if (isDetailRecord(detail)) {
    const completed = detail.completed;
    const total = detail.total;
    if (typeof completed === 'number' && typeof total === 'number') {
      return `${completed}/${total} étapes terminées`;
    }

    if (
      (phase === 'validate:revise' || phase === 'visual:revise') &&
      typeof detail.count === 'number'
    ) {
      return countLabel(detail.count);
    }

    if (phase === 'approval') return 'Plan prêt pour validation.';
  }

  return 'Détails techniques disponibles dans le run.';
}

export function formatDraftEventTime(timestamp: number): DraftEventTime | null {
  const date = new Date(timestamp);
  if (!Number.isFinite(timestamp) || Number.isNaN(date.getTime())) return null;

  return {
    dateTime: date.toISOString(),
    label: date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
