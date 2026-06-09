import { join } from 'node:path';

export const MEDIA_DIR = join(/* turbopackIgnore: true */ process.cwd(), 'media');
export const PUBLIC_FONTS_DIR = join(/* turbopackIgnore: true */ process.cwd(), 'public', 'fonts');
export const SPA_DIR = 'spa';
export const INDEX_HTML = 'index.html';
export const spaDir = (slug: string): string => join(MEDIA_DIR, SPA_DIR, slug);
export const spaUrl = (slug: string): string => `/${SPA_DIR}/${slug}/${INDEX_HTML}`;
export const ARTIFACTS = {
  slidesMd: 'slides.md',
  styleCss: 'style.css',
  headmatter: 'headmatter.yaml',
  fonts: 'fonts',
  pdf: 'slides.pdf',
  dist: 'dist',
  footerLayer: 'slide-bottom.vue',
  logoLayer: 'global-top.vue',
} as const;
