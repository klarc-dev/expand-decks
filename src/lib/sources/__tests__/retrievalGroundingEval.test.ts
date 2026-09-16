import { describe, expect, it } from 'vitest';

import { evaluateGroundedRetrieval } from '../retrievalGroundingEval';

describe('retrieval downstream grounding evaluation', () => {
  it('measures required concepts present in captured verbatim evidence', () => {
    const report = evaluateGroundedRetrieval([
      {
        id: 'pilot-completeness',
        requiredConcepts: ['90 000 EUR', 'six semaines', 'trois agences'],
        evidence: [
          'Le budget du pilote est fixé à 90 000 EUR.',
          'La phase pilote se déroule sur six semaines.',
          'Le pilote couvre trois agences volontaires.',
        ],
      },
      {
        id: 'missing-evidence',
        requiredConcepts: ['CTR-2026-0148', 'préavis écrit'],
        evidence: ['Le présent contrat porte la référence CTR-2026-0148.'],
      },
    ]);

    expect(report.completeness).toBeCloseTo(0.75);
    expect(report.cases[0]).toMatchObject({ completeness: 1, missingConcepts: [] });
    expect(report.cases[1]!.missingConcepts).toEqual(['préavis écrit']);
  });
});
