import { expect, it } from 'vitest';
import { assertMediaFilename, referencedMediaFiles } from '../mediaFiles';
it('stages both JSON headmatter logos and bound image sources', () => {
  expect(
    referencedMediaFiles(
      `klarcLogo: {"light":"/media/logo.svg","dark":"/media/white.svg"}\n<img :src='"./media/diagram.webp"'>\n<img src="/media/logo.svg">`,
    ),
  ).toEqual(['logo.svg', 'white.svg', 'diagram.webp']);
});
it('preserves spaces in a referenced logo filename', () => {
  expect(
    referencedMediaFiles(
      `klarcLogo: {"light":"/media/Cosmetic labs file-05.jpg","dark":null}\n<img src="./media/Project image 1.png">`,
    ),
  ).toEqual(['Cosmetic labs file-05.jpg', 'Project image 1.png']);
});
it.each(['../private', '/absolute', 'nested/file', 'nested\\file', '..', '.', '', 'bad\0name'])(
  'rejects unsafe staged path %s',
  (filename) =>
    expect(() => assertMediaFilename(filename)).toThrow('Invalid staged media filename'),
);
