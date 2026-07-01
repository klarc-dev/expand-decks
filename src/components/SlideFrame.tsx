import React from 'react';

import { MermaidPreview } from './MermaidPreview';

/** Dark stage background behind rendered slides. */
export const SLIDE_STAGE_BG = '#1a1a2e';

export type SlideChrome = {
  footer?: { left: string; center: string; right: string };
  hidden?: boolean;
  logoUrl?: string;
  fonts?: { heading: string; body: string };
};

/** CSS2 stylesheet href for the non-local families a preview needs (or null). */
export function googleFontsHref(fonts?: { heading: string; body: string }): string | null {
  if (!fonts) return null;
  const families = Array.from(new Set([fonts.body, fonts.heading]))
    .map((f) => f.trim())
    .filter((f) => f && f.toLowerCase() !== 'gilroy');
  if (families.length === 0) return null;
  const params = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Presentational inner slide frame used by the admin per-slide SlidePreview.
 * Owns the same `slidev-layout` plus frontmatter classes Slidev applies in the
 * final deck, and the dangerouslySetInnerHTML wiring. Sizing stays with the
 * caller so the admin can scale the final 1280x720 canvas without changing the
 * rendered coordinate system.
 */
export function SlideFrame({
  className,
  chrome,
  html,
  image,
  layout,
  mermaid,
  style,
}: {
  className?: string;
  chrome?: SlideChrome;
  html: string;
  image?: string;
  layout: string;
  mermaid?: { source: string };
  style?: React.CSSProperties;
}) {
  const classes = ['slidev-layout', layout === 'cover' ? 'k-cover' : '', className ?? 'relative']
    .filter(Boolean)
    .join(' ');
  const imageSide = layout === 'image-left' ? 'left' : layout === 'image-right' ? 'right' : null;
  const fontHref = googleFontsHref(chrome?.fonts);
  const fontStyle = chrome?.fonts
    ? ({
        '--k-font-heading': `"${chrome.fonts.heading}", ui-sans-serif, system-ui, sans-serif`,
        '--k-font-body': `"${chrome.fonts.body}", ui-sans-serif, system-ui, sans-serif`,
      } as React.CSSProperties)
    : undefined;
  const frameStyle = { ...fontStyle, ...style };

  if (imageSide && image) {
    const imagePane = (
      <div aria-hidden="true" style={{ ...styles.imagePane, backgroundImage: `url("${image}")` }} />
    );
    const contentPane = (
      <div style={styles.contentPane} dangerouslySetInnerHTML={{ __html: html }} />
    );

    return (
      <>
        {fontHref ? <link href={fontHref} rel="stylesheet" /> : null}
        <div className={classes} style={{ ...styles.imageLayout, ...frameStyle }}>
          <SlideChromeLayer chrome={chrome} />
          {imageSide === 'left' ? imagePane : contentPane}
          {imageSide === 'left' ? contentPane : imagePane}
        </div>
      </>
    );
  }

  if (mermaid) {
    const [before, after] = splitMermaidFence(html);
    return (
      <>
        {fontHref ? <link href={fontHref} rel="stylesheet" /> : null}
        <div className={classes} style={frameStyle}>
          <SlideChromeLayer chrome={chrome} />
          <div style={styles.contents} dangerouslySetInnerHTML={{ __html: before }} />
          <MermaidPreview source={mermaid.source} />
          <div style={styles.contents} dangerouslySetInnerHTML={{ __html: after }} />
        </div>
      </>
    );
  }

  return (
    <>
      {fontHref ? <link href={fontHref} rel="stylesheet" /> : null}
      <div className={classes} style={frameStyle}>
        <SlideChromeLayer chrome={chrome} />
        <div style={styles.contents} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}

function SlideChromeLayer({ chrome }: { chrome?: SlideChrome }) {
  if (!chrome || chrome.hidden) return null;
  return (
    <>
      {chrome.logoUrl ? <img className="k-slide-logo" src={chrome.logoUrl} alt="" /> : null}
      {chrome.footer ? (
        <footer className="k-slide-footer">
          <span>{chrome.footer.left}</span>
          <span>{chrome.footer.center}</span>
          <span className="page">{chrome.footer.right}</span>
        </footer>
      ) : null}
    </>
  );
}

function splitMermaidFence(html: string): [string, string] {
  const match = html.match(/\n*```mermaid\n[\s\S]*?\n```\n*/);
  if (!match || match.index === undefined) return [html, ''];
  return [html.slice(0, match.index), html.slice(match.index + match[0].length)];
}

const styles = {
  imageLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: 0,
  },
  contentPane: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  imagePane: {
    minWidth: 0,
    minHeight: 0,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  },
  contents: {
    display: 'contents',
  },
} satisfies Record<string, React.CSSProperties>;
