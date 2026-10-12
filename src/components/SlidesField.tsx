'use client';

import { BlocksField } from '@payloadcms/ui';
import type { BlocksFieldClientProps } from 'payload';
import { useCallback, useRef } from 'react';

import { rowsToCollapse } from './slidesFieldState';

const ROW_SELECTOR = '.blocks-field__rows > [id] > .collapsible';
const TOGGLE_SELECTOR = ':scope > .collapsible__toggle-wrap > .collapsible__toggle';

/**
 * Payload permits several block rows to remain open. Slides are edited more
 * comfortably as an accordion, so opening one top-level slide closes its open
 * siblings while preserving Payload's native row state and preferences.
 */
export default function SlidesField(props: BlocksFieldClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const collapseOpenSiblings = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const toggle = target.closest<HTMLButtonElement>('.collapsible__toggle');
    if (!toggle || !rootRef.current?.contains(toggle)) return;

    const openingRow = toggle.closest<HTMLElement>('.collapsible');
    if (!openingRow || !openingRow.matches(ROW_SELECTOR)) return;

    const rowElements = [...rootRef.current.querySelectorAll<HTMLElement>(ROW_SELECTOR)];
    const rows = rowElements.map((element) => ({
      collapsed: element.classList.contains('collapsible--collapsed'),
      element,
    }));
    const active = rows.find((row) => row.element === openingRow);
    if (!active) return;

    for (const row of rowsToCollapse(rows, active)) {
      row.element.querySelector<HTMLButtonElement>(TOGGLE_SELECTOR)?.click();
    }
  }, []);

  return (
    <div ref={rootRef} onClickCapture={collapseOpenSiblings}>
      <BlocksField {...props} />
    </div>
  );
}
