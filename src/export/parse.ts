import matter from 'gray-matter';

import type { ParsedDeck, ParsedSlide } from './types';

const SLIDE_SEPARATOR = /^---\s*$/m;
const TRAILING_NOTE = /<!--\s*([\s\S]*?)\s*-->[\s]*$/;
const LOOKS_LIKE_YAML = /^\s*\w[\w-]*\s*:/;

function extractNotes(content: string): { body: string; notes: string | null } {
  const match = TRAILING_NOTE.exec(content);
  if (!match) return { body: content.trim(), notes: null };
  return {
    body: content.slice(0, match.index).trim(),
    notes: match[1]!.trim(),
  };
}

function parseSlide(raw: string, index: number): ParsedSlide {
  let frontmatter: Record<string, unknown> = {};
  let content = raw;

  // Check if the chunk starts with YAML frontmatter (wrapped in ---)
  const trimmed = raw.trim();
  if (trimmed.startsWith('---')) {
    try {
      const parsed = matter(raw);
      if (Object.keys(parsed.data).length > 0) {
        frontmatter = parsed.data;
        content = parsed.content;
      }
    } catch {
      // malformed frontmatter — use raw content as-is
    }
  }

  const { body, notes } = extractNotes(content);
  return { index, frontmatter, body, notes };
}

function mergeYamlChunks(chunks: string[]): string[] {
  const merged: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const trimmed = chunk.trim();
    // If a chunk is pure YAML (no markdown-style content after it) and there's a next chunk,
    // wrap it as frontmatter and prepend it to the next chunk
    if (LOOKS_LIKE_YAML.test(trimmed) && !trimmed.includes('\n#') && i + 1 < chunks.length) {
      merged.push(`---\n${trimmed}\n---\n${chunks[i + 1]}`);
      i++; // skip the next chunk since we merged it
    } else {
      merged.push(chunk);
    }
  }
  return merged;
}

export function parseDeck(markdown: string): ParsedDeck {
  if (!markdown.trim()) {
    return { headmatter: {}, slides: [] };
  }

  let headmatter: Record<string, unknown> = {};
  let remaining = markdown;

  // Extract deck-level headmatter (first fenced YAML block)
  try {
    const parsed = matter(markdown);
    if (Object.keys(parsed.data).length > 0) {
      headmatter = parsed.data;
      remaining = parsed.content;
    }
  } catch {
    // no valid headmatter — treat entire content as slides
  }

  const rawChunks = remaining.split(SLIDE_SEPARATOR).filter((chunk) => chunk.trim().length > 0);
  const chunks = mergeYamlChunks(rawChunks);
  const slides = chunks.map((chunk, i) => parseSlide(chunk, i));

  return { headmatter, slides };
}
