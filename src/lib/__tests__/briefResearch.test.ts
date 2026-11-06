import { describe, expect, it } from 'vitest';
import { requiresWebsiteResearch } from '../briefResearch';

describe('requiresWebsiteResearch', () => {
  it('recognizes an explicit instruction to research a named site', () => {
    expect(
      requiresWebsiteResearch(
        'Présentation du site cosmetic-labs.com sur lequel tu dois te renseigner',
      ),
    ).toBe(true);
    expect(requiresWebsiteResearch('Research https://example.org before drafting')).toBe(true);
  });

  it('does not reject a domain mention or generic research without a site', () => {
    expect(requiresWebsiteResearch('Présente cosmetic-labs.com selon les faits fournis')).toBe(
      false,
    );
    expect(requiresWebsiteResearch('Recherche les avantages SEO pour les laboratoires')).toBe(
      false,
    );
  });
});
