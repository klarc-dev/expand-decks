import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  AGENT_RUN_STALE_MS,
  AGENT_TIME_TRAVEL_STEPS,
  agentRunFingerprint,
  sanitizeRunError,
} from '../agentRunLifecycle';

describe('agent run lifecycle', () => {
  it('preserves old fingerprints for absent ranges and includes canonical bounds when present', () => {
    const base = {
      presentationId: '42',
      brief: 'A sufficiently detailed deck brief',
      mode: 'replace',
      visual: true,
      sourceIds: ['b', 'a'],
      approvalRequired: false,
    };
    const legacy = createHash('sha256')
      .update(
        JSON.stringify({
          ...base,
          sourcePolicy: 'multiple',
          sourceIds: ['a', 'b'],
        }),
      )
      .digest('hex');
    expect(agentRunFingerprint(base)).toBe(legacy);
    expect(agentRunFingerprint({ ...base, slideCountRange: undefined })).toBe(legacy);
    expect(agentRunFingerprint({ ...base, slideCountRange: null })).toBe(legacy);
    const ranged = agentRunFingerprint({
      ...base,
      slideCountRange: { min: 8, max: 12 },
    });
    expect(ranged).not.toBe(legacy);
    expect(ranged).toBe(agentRunFingerprint({ ...base, slideCountRange: { max: 12, min: 8 } }));
    expect(ranged).not.toBe(agentRunFingerprint({ ...base, slideCountRange: { min: 9, max: 12 } }));
    expect(ranged).not.toBe(agentRunFingerprint({ ...base, slideCountRange: { min: 8, max: 13 } }));
  });

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
