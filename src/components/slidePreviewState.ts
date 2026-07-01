import { formStateToBlockData } from '@/lib/formStateToBlockData';

/**
 * Pure selectors over Payload admin form state for the live slide preview (plan
 * U2). Extracted from SlidePreview.tsx so the form-field scraping logic is unit
 * testable without rendering the admin, and so the request key can be derived
 * deterministically for debouncing.
 *
 * `FormFields` mirrors the shape Payload's useFormFields exposes: a flat map of
 * dotted field paths to `{ value }`. Selectors read only the scalar `value`.
 */
export type FormFields = Record<string, { value?: unknown } | undefined>;

const BLOCK_TYPE_KEY = /^slides\.(\d+)\.blockType$/;

/** The block being edited, as renderer-ready block data. */
export function selectBlockData(fields: FormFields, path: string): Record<string, unknown> {
  return formStateToBlockData(fields as never, path) as Record<string, unknown>;
}

/** Deck section titles in slide order — feeds agenda auto-derivation parity. */
export function selectSectionTitles(fields: FormFields): string[] {
  const out: { i: number; title: string }[] = [];
  for (const key of Object.keys(fields)) {
    const m = BLOCK_TYPE_KEY.exec(key);
    if (!m || fields[key]?.value !== 'section') continue;
    const i = Number(m[1]);
    const title = fields[`slides.${i}.title`]?.value;
    if (typeof title === 'string' && title.trim()) out.push({ i, title: title.trim() });
  }
  return out.sort((a, b) => a.i - b.i).map((s) => s.title);
}

/**
 * Ordered block-type array for the whole deck. The server recomputes the tone
 * chain / statement-variant fold from this (plan U4) so preview context matches
 * final export, without trusting client-supplied rendered content.
 */
export function selectBlockTypes(fields: FormFields): string[] {
  const out: { i: number; t: string }[] = [];
  for (const key of Object.keys(fields)) {
    const m = BLOCK_TYPE_KEY.exec(key);
    if (!m) continue;
    const value = fields[key]?.value;
    if (typeof value === 'string' && value) out.push({ i: Number(m[1]), t: value });
  }
  return out.sort((a, b) => a.i - b.i).map((s) => s.t);
}

/** Zero-based slide index for a `slides.<n>.<...>` preview field path. */
export function selectSlideIndex(path: string): number {
  const m = /^slides\.(\d+)\./.exec(path);
  return m ? Number(m[1]) : 0;
}

/** Total slide count derived from blockType keys (min 1 so page math is sane). */
export function selectSlideCount(fields: FormFields): number {
  let count = 0;
  for (const key of Object.keys(fields)) {
    if (BLOCK_TYPE_KEY.test(key)) count++;
  }
  return count || 1;
}

/** Chrome-relevant fields (footer/org/title/language) for footer rendering. */
export function selectChromeFields(fields: FormFields): Record<string, unknown> {
  return {
    'footer.center': fields['footer.center']?.value,
    'footer.enabled': fields['footer.enabled']?.value,
    'footer.left': fields['footer.left']?.value,
    'footer.right': fields['footer.right']?.value,
    language: fields.language?.value,
    organisation: fields.organisation?.value,
    title: fields.title?.value,
  };
}

export type PreviewRequest = {
  block: Record<string, unknown>;
  blockTypes: string[];
  fields: Record<string, unknown>;
  previewFieldPath: string;
  sections: string[];
  slideIndex: number;
};

/** Assemble the full preview request payload from form state. */
export function selectPreviewRequest(fields: FormFields, path: string): PreviewRequest {
  return {
    block: selectBlockData(fields, path),
    blockTypes: selectBlockTypes(fields),
    fields: selectChromeFields(fields),
    previewFieldPath: path,
    sections: selectSectionTitles(fields),
    slideIndex: selectSlideIndex(path),
  };
}

/**
 * Stable key for a preview request — same inputs produce the same string, so
 * the debounced effect only refetches when something that affects the rendered
 * preview actually changed.
 */
export function previewRequestKey(request: PreviewRequest): string {
  return JSON.stringify(request);
}
