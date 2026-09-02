/**
 * Source-aware research helper shared by the gather and structure phases.
 * Raw descriptors and tool output remain process-local. Evidence is recorded by
 * the wrapped MCP tool at the exact result boundary before the model sees it.
 */
import { openSourceToolsets } from '../../lib/sources/mcpConnector';
import { legacySourcePolicy } from '../../lib/sources/policy';
import { resolveSourcePolicy } from '../../lib/sources/resolve';
import type { Evidence, SourceFailure, SourcePolicy } from '../../lib/sources/types';
import { researchWithSources } from '../model';

export type ResearchResult = {
  notes: string;
  evidence: Evidence[];
  failures: SourceFailure[];
};

export function hasSources(sourceIds: readonly string[] | undefined): boolean {
  return !!sourceIds && sourceIds.length > 0;
}

export async function researchSources(
  sourceIds: readonly string[] | undefined,
  opts: {
    name: string;
    instructions: string;
    prompt: string;
    abortSignal?: AbortSignal;
    sourcePolicy?: SourcePolicy;
  },
): Promise<ResearchResult> {
  const { policy, sources } = resolveSourcePolicy(
    opts.sourcePolicy ?? legacySourcePolicy(sourceIds),
  );
  if (sources.length === 0) return { notes: '', evidence: [], failures: [] };

  const { toolsets, failures, recorder, disconnect } = await openSourceToolsets(sources);
  try {
    const notes = await researchWithSources({
      name: opts.name,
      instructions: opts.instructions,
      prompt: opts.prompt,
      toolsets,
      timeoutMs: Math.max(...sources.map((source) => source.timeoutMs)),
      toolCallConcurrency: Math.min(...sources.map((source) => source.toolCallConcurrency)),
      abortSignal: opts.abortSignal,
    });
    const evidence = recorder.snapshot();
    if (evidence.length === 0) {
      throw new Error('Selected sources produced no captured tool evidence');
    }
    if (
      policy.mode === 'exclusive' &&
      evidence.some((item) => item.sourceId !== policy.sourceIds[0])
    ) {
      throw new Error('Exclusive source policy rejected evidence from another source');
    }
    return { notes: notes.trim(), evidence, failures };
  } catch (error) {
    if (policy.mode === 'exclusive' || sources.some((source) => source.failureMode === 'strict'))
      throw error;
    const message = error instanceof Error ? error.message : String(error);
    const runtimeFailures = sources.map(
      (source): SourceFailure => ({
        sourceId: source.id,
        stage: 'tool',
        code: /timeout/i.test(message) ? 'timeout' : 'unknown',
        message: message.slice(0, 1_000),
      }),
    );
    const evidence = recorder.snapshot();
    if (evidence.length === 0) throw error;
    return { notes: '', evidence, failures: [...failures, ...runtimeFailures] };
  } finally {
    await disconnect();
  }
}
