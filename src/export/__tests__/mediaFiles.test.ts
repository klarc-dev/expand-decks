import { expect, it } from 'vitest';
import { assertMediaFilename, referencedMediaFiles } from '../mediaFiles';
it('stages both JSON headmatter logos and bound image sources', () => {
  expect(
    referencedMediaFiles(
      `klarcLogo: {"light":"/media/logo.svg","dark":"/media/white.svg"}\n<img :src='"./media/diagram.webp"'>\n<img src="/media/logo.svg">`,
    ),
  ).toEqual(['logo.svg', 'white.svg', 'diagram.webp']);
});
it.each(['../private', '/absolute', 'nested/file', 'nested\\file', '..', '.', '', 'bad\0name'])(
  'rejects unsafe staged path %s',
  (filename) =>
    expect(() => assertMediaFilename(filename)).toThrow('Invalid staged media filename'),
);
