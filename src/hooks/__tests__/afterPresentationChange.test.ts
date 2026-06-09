import { describe, expect, it } from 'vitest';

import { buildInputsChanged } from '../afterPresentationChange';

const base = {
  slides: [{ blockType: 'cover', title: 'A' }],
  organisation: 1,
  footer: { enabled: true, left: '{org.name}', center: '', right: '{page} / {total}' },
  title: 'Deck',
  language: 'fr',
};

describe('buildInputsChanged — rebuild fingerprint', () => {
  it('is false when nothing build-affecting changed', () => {
    expect(buildInputsChanged({ ...base }, { ...base })).toBe(false);
  });

  it('ignores non-build fields (e.g. build artifacts / status)', () => {
    expect(
      buildInputsChanged(
        { ...base, lastBuildStatus: 'success', spaUrl: '/x' },
        { ...base, lastBuildStatus: 'idle', spaUrl: null },
      ),
    ).toBe(false);
  });

  it('detects slides changes', () => {
    expect(buildInputsChanged({ ...base, slides: [{ blockType: 'cta', title: 'Z' }] }, base)).toBe(
      true,
    );
  });

  it('detects organisation change (theme swap)', () => {
    expect(buildInputsChanged({ ...base, organisation: 2 }, base)).toBe(true);
  });

  it('treats a populated org relationship the same as its id', () => {
    expect(buildInputsChanged({ ...base, organisation: { id: 1, name: 'Klarc' } }, base)).toBe(
      false,
    );
  });

  it('detects footer, title and language changes', () => {
    expect(buildInputsChanged({ ...base, footer: { ...base.footer, left: '{title}' } }, base)).toBe(
      true,
    );
    expect(buildInputsChanged({ ...base, title: 'New' }, base)).toBe(true);
    expect(buildInputsChanged({ ...base, language: 'en' }, base)).toBe(true);
  });
});
