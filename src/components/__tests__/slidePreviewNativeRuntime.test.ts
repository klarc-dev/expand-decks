import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/SlidePreview.tsx', 'utf8');
const styles = readFileSync('src/components/SlidePreview.scss', 'utf8');

function functionSource(name: string, nextMarker: string) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(nextMarker, start);
  if (start < 0 || end < 0) throw new Error(`Unable to isolate ${name}`);
  return source.slice(start, end);
}

describe('SlidePreview native runtime contract', () => {
  it('uses the API native Slidev URL only for the main PreviewFrame', () => {
    const previewFrame = functionSource('PreviewFrame', '\nconst candidateScalerStyle');
    const layoutModal = functionSource('LayoutCompatibilityModal', '\ntype PreviewResult');

    expect(previewFrame).toContain('<iframe');
    expect(previewFrame).toContain('src={result.preview.url}');
    expect(previewFrame).not.toContain('<SlideFrame');
    expect(layoutModal).toContain('<SlideFrame');
  });

  it('preserves live edit debounce and rejects a response without a native URL', () => {
    expect(source).toContain('const PREVIEW_DEBOUNCE_MS = 200');
    expect(source).toContain('}, PREVIEW_DEBOUNCE_MS);');
    expect(source).toContain('if (!nextResult.preview.url)');
    expect(source).toContain("setError('Le rendu Slidev natif est indisponible.')");
  });

  it('keeps the iframe locked to the existing canvas dimensions', () => {
    expect(source).toContain('height={result.canvas.height}');
    expect(source).toContain('width={result.canvas.width}');
    expect(styles).toContain('height: var(--slide-preview-height)');
    expect(styles).toContain('width: var(--slide-preview-width)');
  });
});
