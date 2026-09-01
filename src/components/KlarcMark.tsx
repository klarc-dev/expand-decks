import type React from 'react';

import './KlarcMark.scss';

type KlarcMarkProps = Omit<
  React.ComponentPropsWithoutRef<'img'>,
  'alt' | 'height' | 'src' | 'style' | 'width'
> & {
  size?: 'icon' | 'logo';
};

export function KlarcMark({ className, size = 'icon', ...props }: KlarcMarkProps) {
  return (
    // Inline SVG gains nothing from next/image and would require dangerouslyAllowSVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt="Klarc"
      className={['klarc-mark', `klarc-mark--${size}`, className].filter(Boolean).join(' ')}
      src="/brand/klarc-logomark.svg"
    />
  );
}
