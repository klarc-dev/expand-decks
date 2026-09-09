import { describe, expect, it } from 'vitest';

import { parseLayoutViolations, SlideLayoutValidationError } from '../../lib/slideLayoutValidation';

const validatorOutput = `noise before JSON
{
  "error": "Slide layout validation failed",
  "violations": [
    {
      "slide": 12,
      "selector": ".k-content-main",
      "issue": "overflow",
      "verticalPx": 11,
      "horizontalPx": 0
    }
  ]
}`;

describe('layout validation errors', () => {
  it('parses the validator JSON from command stderr', () => {
    expect(parseLayoutViolations(validatorOutput)).toEqual([
      {
        slide: 12,
        selector: '.k-content-main',
        issue: 'overflow',
        verticalPx: 11,
        horizontalPx: 0,
      },
    ]);
  });

  it('stores a concise author-facing error instead of the failed command', () => {
    const error = new SlideLayoutValidationError(parseLayoutViolations(validatorOutput));

    expect(error.message).toBe('La slide 12 contient trop de contenu pour être exportée.');
    expect(error.message).not.toContain('validate-layout.mjs');
    expect(error.message).not.toContain('verticalPx');
  });

  it('lists every affected slide once', () => {
    const error = new SlideLayoutValidationError([
      { slide: 4, selector: '.k-content-main', issue: 'overflow' },
      { slide: 4, selector: '.k-card-stack', issue: 'footer-intersection' },
      { slide: 9, selector: '.k-content-main', issue: 'overflow' },
    ]);

    expect(error.message).toBe('Les slides 4, 9 contiennent trop de contenu pour être exportées.');
  });
});
