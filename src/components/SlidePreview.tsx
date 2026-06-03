'use client';

import React from 'react';
import { useForm } from '@payloadcms/ui';

import { renderCover } from '@/export/blocks/cover';
import { renderSection } from '@/export/blocks/section';
import { renderStatement } from '@/export/blocks/statement';
import { renderTwoCols } from '@/export/blocks/twoCols';
import { renderCardGrid } from '@/export/blocks/cardGrid';
import { renderStats } from '@/export/blocks/stats';
import { renderQuotes } from '@/export/blocks/quotes';
import { renderCta } from '@/export/blocks/cta';
import { renderMarkdown } from '@/export/blocks/markdown';

import '@/export/style.css';

const RENDERERS: Record<string, (block: never) => string> = {
  cover: renderCover as (block: never) => string,
  section: renderSection as (block: never) => string,
  statement: renderStatement as (block: never) => string,
  twoCols: renderTwoCols as (block: never) => string,
  cardGrid: renderCardGrid as (block: never) => string,
  stats: renderStats as (block: never) => string,
  quotes: renderQuotes as (block: never) => string,
  cta: renderCta as (block: never) => string,
  markdown: renderMarkdown as (block: never) => string,
};

function stripFrontmatter(slideMd: string): string {
  return slideMd.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

function extractLayout(slideMd: string): string {
  const match = slideMd.match(/^---\n[\s\S]*?layout:\s*(\S+)/);
  return match?.[1] ?? 'default';
}

const SlidePreview: React.FC<{ path: string }> = ({ path }) => {
  const { getSiblingData } = useForm();
  const data = getSiblingData(path) as Record<string, unknown> | undefined;

  if (!data?.blockType) return null;

  const renderer = RENDERERS[data.blockType as string];
  if (!renderer) return null;

  const rawMd = renderer(data as never);
  const html = stripFrontmatter(rawMd);
  const layout = extractLayout(rawMd);

  return (
    <div style={styles.wrapper}>
      <div style={styles.scaler}>
        <div
          className={`slidev-layout ${layout === 'cover' ? 'k-cover' : ''}`}
          style={styles.slide}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    marginTop: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--theme-elevation-150)',
    background: '#1a1a2e',
  },
  scaler: {
    width: '960px',
    height: '540px',
    transform: 'scale(var(--slide-scale, 0.5))',
    transformOrigin: 'top left',
    marginBottom: 'calc(-540px * (1 - var(--slide-scale, 0.5)))',
    marginRight: 'calc(-960px * (1 - var(--slide-scale, 0.5)))',
  },
  slide: {
    width: '960px',
    height: '540px',
    overflow: 'hidden',
    position: 'relative' as const,
    padding: '3rem 4rem',
  },
} as const;

export default SlidePreview;
