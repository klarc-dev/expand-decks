import { describe, expect, it } from 'vitest';

import { candidateThemeVariables } from '../candidateThemeVariables';

describe('candidate preview theme variables', () => {
  it('projects generated organisation tokens onto the candidate frame only', () => {
    expect(
      candidateThemeVariables(`& {
        --k-teal: #02585C;
        --k-paper: #FAFBFB;
        --k-font-heading: "Newsreader", ui-sans-serif, system-ui, sans-serif;
      }`),
    ).toMatchObject({
      '--k-teal': '#02585C',
      '--k-paper': '#FAFBFB',
      '--k-font-heading': '"Newsreader", ui-sans-serif, system-ui, sans-serif',
    });
  });
});
