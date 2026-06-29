/**
 * Source-aware research helper shared by the gather and structure phases.
 *
 * Only `sourceIds` (plain strings) ever travel through workflow inputData — the
 * transport/secret descriptors are resolved here, server-side, and the live
 * MCPClient is opened and disconnected within this call. Nothing non-serializable
 * (or secret) is threaded through Mastra's persisted step IO.
 */
import { openSourceToolsets } from '../../lib/sources/mcpConnector';
import { resolveSources } from '../../lib/sources/resolve';
import type { Evidence } from '../../lib/sources/types';
import { researchWithSources } from '../model';

export type ResearchResult = { notes: string; evidence: Evidence[] };

const EVIDENCE_SUMMARY_MAX = 600;
const EVIDENCE_EXCERPT_RADIUS = 240;

function evidenceExcerpt(notes: string, source: { id: string; label: string }): string | undefined {
  const lower = notes.toLowerCase();
  const needles = [source.id.toLowerCase(), source.label.toLowerCase()];
  const hit = needles
    .map((needle) => lower.indexOf(needle))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (hit === undefined) return undefined;

  const start = Math.max(0, hit - EVIDENCE_EXCERPT_RADIUS);
  const end = Math.min(notes.length, hit + EVIDENCE_EXCERPT_RADIUS);
  return notes.slice(start, end).trim().slice(0, EVIDENCE_SUMMARY_MAX);
}

export function hasSources(sourceIds: readonly string[] | undefined): boolean {
  return !!sourceIds && sourceIds.length > 0;
}

/**
 * Resolve the selected source ids, query them via MCP tools, and return the
 * model's grounded notes plus a compact per-source evidence list for persistence.
 * Returns empty when no sources are selected (caller stays on the brief-only path).
 */
export async function researchSources(
  sourceIds: readonly string[] | undefined,
  opts: { name: string; instructions: string; prompt: string },
): Promise<ResearchResult> {
  const sources = resolveSources(sourceIds);
  if (sources.length === 0) return { notes: '', evidence: [] };

  const { toolsets, disconnect } = await openSourceToolsets(sources);
  try {
    const notes = await researchWithSources({
      name: opts.name,
      instructions: opts.instructions,
      prompt: opts.prompt,
      toolsets,
    });
    if (!notes) return { notes: '', evidence: [] };

    const evidence: Evidence[] = sources.flatMap((source) => {
      const summary = evidenceExcerpt(notes, source);
      return summary ? [{ sourceId: source.id, sourceLabel: source.label, summary }] : [];
    });
    return { notes, evidence };
  } finally {
    await disconnect();
  }
}
