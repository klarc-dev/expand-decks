import { describe, expect, it } from 'vitest';
import { buildSlidesMd } from '../buildSlidesMd';
import { renderBlockPreview } from '../preview';
import { vueBoundSrc } from '../people';

describe('uploaded slide illustrations', () => {
  it('keeps hostile URL characters inert in Vue bindings and HTML previews', () => {
    const url = `https://example.test/a' onload='alert(1)&quot;"<x>`;
    const binding = vueBoundSrc(url);
    expect(binding.match(/'/g)).toHaveLength(2);
    expect(binding).not.toContain('<x>');
    expect(binding).not.toContain('&quot;');
    const preview = renderBlockPreview({ blockType: 'twoCols', title: 'Safe', image: { url } });
    expect(preview?.html).not.toContain(':src=');
    expect(preview?.html).toContain('&lt;x&gt;');
    expect(preview?.html).toContain('&amp;quot;');
  });
  it.each(['left', 'right'] as const)(
    'embeds a staged image inside the %s side of the layout',
    (imagePosition) => {
      const block = {
        blockType: 'twoCols' as const,
        title: 'Illustrated slide',
        rightCards: [],
        imagePosition,
        image: {
          url: 'https://slides.example/api/media/file/diagram.webp',
          filename: 'diagram.webp',
        },
      };
      const md = buildSlidesMd({ title: 'Test', slides: [block] });
      expect(md).toContain('layout: default');
      expect(md).toContain(`k-image-split--${imagePosition}`);
      expect(md).toContain(`<img`);
      expect(md).toContain(`:src='"./media/diagram.webp"'`);
      expect(md).not.toContain('/api/media/file/');
      const preview = renderBlockPreview(block);
      expect(preview?.html).toContain('src="/media/diagram.webp"');
    },
  );
});
