import { describe, expect, it } from 'vitest';

import { validateGrounding } from '../grounding';
import { contentSha256, evidenceId } from '../../lib/sources/types';

const excerpt = 'Revenue grew 12 percent in 2025.';
const hash = contentSha256(JSON.stringify({ text: excerpt }));
const evidence = [
  {
    id: evidenceId({
      sourceId: 'docs',
      toolName: 'search',
      toolCallId: 'call-1',
      contentSha256: hash,
    }),
    sourceId: 'docs',
    sourceLabel: 'Docs',
    claim: excerpt,
    excerpt,
    toolName: 'search',
    toolCallId: 'call-1',
    retrievedAt: '2026-08-25T18:00:00.000Z',
    contentSha256: hash,
  },
];

describe('validateGrounding', () => {
  it('accepts dossier sources backed by captured tool evidence', () => {
    expect(validateGrounding({ sources: ['docs'] }, evidence)).toEqual(evidence);
  });

  it('rejects dossier sources without captured tool evidence', () => {
    expect(() => validateGrounding({ sources: ['crm'] }, evidence)).toThrow(/crm/);
  });
});
