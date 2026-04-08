export type MarkdownBlockData = {
  blockType: 'markdown';
  layout?: string | null;
  frontmatter?: string | null;
  content?: string | null;
};

/** Passthrough renderer — admin-only block, content is not escaped. */
export function renderMarkdown(block: MarkdownBlockData): string {
  const fmLines: string[] = [];
  if (block.layout) {
    fmLines.push(`layout: ${block.layout}`);
  }
  if (block.frontmatter) {
    fmLines.push(block.frontmatter);
  }

  const frontmatter = fmLines.length > 0
    ? `---\n${fmLines.join('\n')}\n---`
    : '---\n---';

  const content = block.content ?? '';

  return `${frontmatter}\n\n${content}`;
}
