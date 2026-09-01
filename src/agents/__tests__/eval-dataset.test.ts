import { describe, expect, it } from 'vitest';

import dataset from '../evals/dataset.v1.json';
import { sanitizeToolResult } from '../../lib/sources/toolPolicy';

describe('agent evaluation dataset v1', () => {
  it('keeps versioned bilingual workflow cases', () => {
    const workflowRows = dataset.filter((row) => 'input' in row);
    expect(workflowRows).toHaveLength(2);
    expect(workflowRows.map((row) => row.input?.language)).toEqual(['fr', 'en']);
  });

  it('treats prompt injection as bounded untrusted data while retaining grounded content', () => {
    const row = dataset.find((item) => 'toolResult' in item)!;
    const result = sanitizeToolResult(row.toolResult);
    const sanitized = JSON.stringify(result);
    expect(result.trust).toBe('untrusted-source-data');
    expect(Buffer.byteLength(sanitized)).toBeLessThan(101_000);
    expect(sanitized).toContain(row.expectedSanitized);
  });
});
