import { describe, expect, it } from 'vitest';

import {
  AGENT_RUN_STALE_MS,
  AGENT_TIME_TRAVEL_STEPS,
  agentRunFingerprint,
  sanitizeRunError,
} from '../agentRunLifecycle';

describe('agent run lifecycle', () => {
  it('creates the same fingerprint regardless of source selection order', () => {
    const base = {
      presentationId: '42',
      brief: 'A sufficiently detailed deck brief',
      mode: 'replace',
      visual: true,
      approvalRequired: false,
    };
    expect(agentRunFingerprint({ ...base, sourceIds: ['b', 'a'] })).toBe(
      agentRunFingerprint({ ...base, sourceIds: ['a', 'b'] }),
    );
  });

  it('changes the fingerprint when immutable workflow input changes', () => {
    const base = {
      presentationId: '42',
      brief: 'A sufficiently detailed deck brief',
      mode: 'replace',
      visual: true,
      sourceIds: ['a'],
      approvalRequired: false,
    };
    expect(agentRunFingerprint(base)).not.toBe(
      agentRunFingerprint({ ...base, approvalRequired: true }),
    );
  });

  it('changes the fingerprint when the source policy changes', () => {
    const base = {
      presentationId: '42',
      brief: 'A sufficiently detailed deck brief',
      mode: 'replace',
      visual: true,
      sourceIds: ['a'],
      approvalRequired: false,
    };
    expect(agentRunFingerprint({ ...base, sourcePolicy: 'exclusive' })).not.toBe(
      agentRunFingerprint({ ...base, sourcePolicy: 'multiple' }),
    );
  });

  it('allows time travel only from stable post-draft checkpoints', () => {
    expect(AGENT_TIME_TRAVEL_STEPS).toEqual(['validate', 'visual']);
    expect(AGENT_RUN_STALE_MS).toBeGreaterThanOrEqual(60_000);
  });

  it('redacts credential-like values from persisted failures', () => {
    expect(sanitizeRunError(new Error('authorization=Bearer-secret token=abc'))).toContain(
      '[REDACTED]',
    );
    expect(sanitizeRunError(new Error('authorization=Bearer-secret token=abc'))).not.toContain(
      'Bearer-secret',
    );
  });
});
