const STORAGE_KEYS = ['id', 'blockName'] as const;

/** Replace one slide while keeping the untouched slide objects and row metadata stable. */
export function replaceSlideAt<T extends Record<string, unknown>>(
  slides: T[],
  index: number,
  replacement: Record<string, unknown>,
): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= slides.length) {
    throw new Error(`Invalid slide index: ${index}`);
  }

  const current = slides[index]!;
  const metadata = Object.fromEntries(
    STORAGE_KEYS.flatMap((key) => (current[key] === undefined ? [] : [[key, current[key]]])),
  );
  const next = [...slides];
  next[index] = { ...replacement, ...metadata } as T;
  return next;
}
