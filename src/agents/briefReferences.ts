/** A named website is the subject, not proof that any of its pages were visited. */
export function referencesFromBrief(
  references: readonly string[] | undefined,
  brief: string,
): string[] {
  return (references ?? []).filter(
    (reference) =>
      brief.includes(reference) &&
      !/^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?$/i.test(
        reference.trim(),
      ),
  );
}
