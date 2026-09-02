import { describe, expect, it } from 'vitest';

import { EVAL_THRESHOLDS, RevisionFixtureSchema, WorkflowFixtureSchema } from '../evals/config';
import { revisionDatasetV1 } from '../evals/datasets/revision.v1';
import { workflowDatasetV1 } from '../evals/datasets/workflow.v1';

const allIds = [...workflowDatasetV1, ...revisionDatasetV1].map((item) => item.externalId);

describe('versioned production evaluation datasets', () => {
  it('validates bilingual, explicit, and multi-turn fixtures', () => {
    expect(workflowDatasetV1.map((item) => WorkflowFixtureSchema.parse(item))).toHaveLength(3);
    expect(revisionDatasetV1.map((item) => RevisionFixtureSchema.parse(item))).toHaveLength(2);
    expect(workflowDatasetV1.map((item) => item.input.language)).toContain('fr');
    expect(workflowDatasetV1.map((item) => item.input.language)).toContain('en');
  });

  it('uses stable unique external IDs and bounded thresholds', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const threshold of Object.values(EVAL_THRESHOLDS)) {
      expect(threshold).toBeGreaterThanOrEqual(0);
      expect(threshold).toBeLessThanOrEqual(1);
    }
  });

  it('provides a factual grounding contract for every workflow fixture', () => {
    for (const item of workflowDatasetV1) {
      expect(item.groundTruth.allowedFacts.length, item.externalId).toBeGreaterThan(0);
    }
  });
});
