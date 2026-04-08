const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ENTITY_RE = /[&<>"']/g;

/** HTML-encode characters that could cause XSS in generated Slidev output. */
export function escape(text: string): string {
  return text.replace(HTML_ENTITY_RE, (ch) => HTML_ENTITIES[ch]!);
}

/**
 * Convert simple inline markdown (bold, italic, links) to HTML while
 * escaping everything else. Does NOT support block-level markdown.
 */
export function md(text: string): string {
  // First escape all HTML entities
  let result = escape(text);

  // Convert **bold** → <strong>bold</strong>
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* → <em>italic</em> (but not inside <strong> tags already)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Convert [text](url) → <a href="url">text</a>
  result = result.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2">$1</a>',
  );

  return result;
}

/** Stagger delay in milliseconds between animated items. */
export const STAGGER_DELAY_MS = 100;

/** Generate v-motion attribute string for staggered entrance animation. */
export function vMotion(index: number): string {
  const delay = STAGGER_DELAY_MS * (index + 1);
  return `v-motion :initial="{ y: 20, opacity: 0 }" :enter="{ y: 0, opacity: 1, transition: { delay: ${delay} } }"`;
}
