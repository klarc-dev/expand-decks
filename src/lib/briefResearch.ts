/** An explicit request to inspect a named public site cannot be fulfilled by the KB-only research phase. */
export function requiresWebsiteResearch(brief: string): boolean {
  const namedSite = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i;
  const researchRequest =
    /\b(?:renseigne(?:r|ment|s)?|recherch(?:e|er|es|ez)|consult(?:e|er|ez)|visit(?:e|er|ez)|inspect(?:e|er|ez)|research|investigate|look\s+up|browse|visit|inspect)\b/i;
  return namedSite.test(brief) && researchRequest.test(brief);
}
