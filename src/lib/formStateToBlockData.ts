/**
 * Rebuild a nested block-data object from Payload's flat form-state field map.
 *
 * Form state keys sibling fields by full dotted paths
 * (`slides.0.title`, `slides.0.cards.1.description`, …). Given the preview
 * field's own path (`slides.0.preview`), collect every sibling under the same
 * parent and reassemble objects/arrays (numeric segments become array
 * indices), so block renderers receive the same shape as a saved document.
 */
export function formStateToBlockData(
  fields: Record<string, { value?: unknown; rows?: unknown } | undefined>,
  previewFieldPath: string,
): Record<string, unknown> {
  const parentPath = previewFieldPath.split('.').slice(0, -1).join('.');
  const prefix = parentPath ? `${parentPath}.` : '';

  const out: Record<string, unknown> = {};

  for (const key of Object.keys(fields)) {
    if (!key.startsWith(prefix) || key === previewFieldPath) continue;
    const rel = key.slice(prefix.length);
    if (!rel) continue;

    const segs = rel.split('.');
    let cur: Record<string, unknown> | unknown[] = out;
    for (let i = 0; i < segs.length - 1; i++) {
      const seg = segs[i]!;
      const nextIsIndex = /^\d+$/.test(segs[i + 1]!);
      const slot = Array.isArray(cur) ? Number(seg) : seg;
      const container = (cur as Record<string | number, unknown>)[slot];
      if (container === undefined || container === null || typeof container !== 'object') {
        (cur as Record<string | number, unknown>)[slot] = nextIsIndex ? [] : {};
      }
      cur = (cur as Record<string | number, unknown>)[slot] as Record<string, unknown> | unknown[];
    }

    const last = segs[segs.length - 1]!;
    const lastSlot = Array.isArray(cur) ? Number(last) : last;
    const target = cur as Record<string | number, unknown>;
    const entry = fields[key];

    // Array-parent entries (entry carries `rows`) hold a row count in
    // `value`, not user data — materialize an empty array and let the rows'
    // leaf keys fill it. Never clobber a container another key already built.
    if (entry && Array.isArray(entry.rows)) {
      if (typeof target[lastSlot] !== 'object' || target[lastSlot] === null) {
        target[lastSlot] = [];
      }
      continue;
    }
    if (typeof target[lastSlot] === 'object' && target[lastSlot] !== null) {
      continue;
    }
    target[lastSlot] = entry?.value;
  }

  return out;
}
