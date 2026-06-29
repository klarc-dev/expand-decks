import type { MarkdownBlockData } from '../../blocks/spec/markdown';
import { yamlScalar } from '../utils';

export type { MarkdownBlockData };

function ensureMarkdownRail(frontmatter: string): string {
  const classLine = /^(\s*class\s*:\s*)(.*)$/m;
  const match = frontmatter.match(classLine);
  if (!match) return `${frontmatter}\nclass: relative k-markdown-slide`;

  const value = match[2] ?? '';
  if (/\bk-markdown-slide\b/.test(value)) return frontmatter;
  return frontmatter.replace(classLine, (_line, prefix, classes) => {
    const trimmed = String(classes).trim();
    return `${prefix}${trimmed ? `${trimmed} ` : ''}k-markdown-slide`;
  });
}

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
    fmLines.push(ensureMarkdownRail(block.frontmatter));
  } else {
    fmLines.push('class: relative k-markdown-slide');
  }

  const frontmatter = `---\n${fmLines.join('\n')}\n---`;
  const content = block.content ?? '';

  return `${frontmatter}\n\n${content}`;
}
