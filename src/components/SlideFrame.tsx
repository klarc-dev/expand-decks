import React from 'react';

/** Dark stage background behind rendered slides. */
export const SLIDE_STAGE_BG = '#1a1a2e';

/**
 * Presentational inner slide frame used by the admin per-slide SlidePreview.
 * Owns the same `slidev-layout` plus frontmatter classes Slidev applies in the
 * final deck, and the dangerouslySetInnerHTML wiring. Sizing stays with the
 * caller so the admin can scale the final 1280x720 canvas without changing the
 * rendered coordinate system.
 */
export function SlideFrame({
  className,
  html,
  image,
  layout,
  style,
}: {
  className?: string;
  html: string;
  image?: string;
  layout: string;
  style?: React.CSSProperties;
}) {
  const classes = ['slidev-layout', layout === 'cover' ? 'k-cover' : '', className ?? 'relative']
    .filter(Boolean)
    .join(' ');
  const imageSide = layout === 'image-left' ? 'left' : layout === 'image-right' ? 'right' : null;

  if (imageSide && image) {
    const imagePane = (
      <div aria-hidden="true" style={{ ...styles.imagePane, backgroundImage: `url("${image}")` }} />
    );
    const contentPane = (
      <div style={styles.contentPane} dangerouslySetInnerHTML={{ __html: html }} />
    );

    return (
      <div className={classes} style={{ ...styles.imageLayout, ...style }}>
        {imageSide === 'left' ? imagePane : contentPane}
        {imageSide === 'left' ? contentPane : imagePane}
      </div>
    );
  }

  return <div className={classes} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
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
} satisfies Record<string, React.CSSProperties>;
