import { describe, expect, it } from 'vitest';

import { normalizeWorkflowPhase } from '../agentRunCommands';

describe('normalizeWorkflowPhase', () => {
  it('ignores Mastra mapping step ids that are not durable agent phases', () => {
    expect(normalizeWorkflowPhase('mapping_deckWorkflow_0')).toBeUndefined();
  });

  it('keeps durable phases and strips sub-phase detail', () => {
    expect(normalizeWorkflowPhase('validate:revise')).toBe('validate');
    expect(normalizeWorkflowPhase('draft')).toBe('draft');
  });
});
