import type { MarkdownBlockData } from '../../blocks/spec/markdown';
import { yamlScalar } from '../utils';

export type { MarkdownBlockData };

/** Passthrough renderer — admin-only block, content is not escaped. */
export function renderMarkdown(block: MarkdownBlockData): string {
  if (block.frontmatter && /^---\s*$/m.test(block.frontmatter)) {
    throw new Error('Markdown frontmatter cannot contain YAML boundary lines');
  }

  const fmLines: string[] = [];
  if (block.layout) {
    fmLines.push(`layout: ${yamlScalar(block.layout)}`);
  }
  if (block.frontmatter) {
    fmLines.push(block.frontmatter);
  }
  if (!block.frontmatter || !/^\s*class\s*:/m.test(block.frontmatter)) {
    fmLines.push('class: relative k-markdown-slide');
  }

  const frontmatter = `---\n${fmLines.join('\n')}\n---`;
  const content = block.content ?? '';

  return `${frontmatter}\n\n${content}`;
}
