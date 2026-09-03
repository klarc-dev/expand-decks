/**
 * Source-aware research helper shared by the gather and structure phases.
 * Raw descriptors and tool output remain process-local. Evidence is recorded by
 * the wrapped MCP tool at the exact result boundary before the model sees it.
 */
import { sourceResolutionContextForUser } from '../../lib/sources/serverContext';
import { openSourceToolsets } from '../../lib/sources/mcpConnector';
import { resolveSourcePolicy } from '../../lib/sources/resolve';
import {
  SourceConnectorError,
  SourceResearchError,
  type Evidence,
  type SourceFailure,
  type SourcePolicy,
} from '../../lib/sources/types';
import { researchWithSources } from '../model';

export type ResearchResult = {
  notes: string;
  evidence: Evidence[];
  failures: SourceFailure[];
};

export function hasSources(policy: SourcePolicy): boolean {
  return policy.sourceIds.length > 0;
}

function researchFailure(
  sourceId: string,
  stage: SourceFailure['stage'],
  code: SourceFailure['code'],
  message: string,
): SourceResearchError {
  const failures = [{ sourceId, stage, code, message: message.slice(0, 1_000) }];
  return new SourceResearchError(
    `SOURCE_FAILURES:${JSON.stringify(failures)} ${message}`,
    failures,
  );
}

function asResearchError(error: unknown): SourceResearchError | undefined {
  if (error instanceof SourceResearchError) return error;
  if (error instanceof SourceConnectorError) {
    return new SourceResearchError(
      `SOURCE_FAILURES:${JSON.stringify(error.failures)} ${error.message}`,
      error.failures,
    );
  }
  return undefined;
}

async function resolveResearchPolicy(sourcePolicy: SourcePolicy, userId?: string) {
  const knowledgeId = sourcePolicy.sourceIds.find((id) => id.startsWith('knowledge_'));
  if (!knowledgeId) return resolveSourcePolicy(sourcePolicy);
  if (!userId) {
    throw researchFailure(
      knowledgeId,
      'connect',
      'unavailable',
      'Knowledge source resolution requires an authenticated user id',
    );
  }
  return resolveSourcePolicy(sourcePolicy, await sourceResolutionContextForUser(userId));
}

export async function researchSources(
  sourcePolicy: SourcePolicy,
  opts: {
    name: string;
    instructions: string;
    prompt: string;
    abortSignal?: AbortSignal;
    userId?: string;
  },
): Promise<ResearchResult> {
  const { policy, sources } = await resolveResearchPolicy(sourcePolicy, opts.userId);
  if (sources.length === 0) return { notes: '', evidence: [], failures: [] };

  let opened: Awaited<ReturnType<typeof openSourceToolsets>>;
  try {
    opened = await openSourceToolsets(sources);
  } catch (error) {
    const researchError = asResearchError(error);
    if (researchError) throw researchError;
    throw error;
  }
  const { toolsets, failures, recorder, disconnect } = opened;
  if (policy.mode === 'exclusive' && failures.length > 0) {
    await disconnect();
    throw new SourceResearchError(
      `SOURCE_FAILURES:${JSON.stringify(failures)} Exclusive source ${policy.sourceIds[0]} could not be opened`,
      failures,
    );
  }
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
      throw researchFailure(
        policy.sourceIds[0]!,
        'tool',
        'invalid-result',
        'Selected sources produced no captured tool evidence',
      );
    }
    if (
      policy.mode === 'exclusive' &&
      evidence.some((item) => item.sourceId !== policy.sourceIds[0])
    ) {
      throw researchFailure(
        policy.sourceIds[0]!,
        'policy',
        'invalid-result',
        'Exclusive source policy rejected evidence from another source',
      );
    }
    return { notes: notes.trim(), evidence, failures };
  } catch (error) {
    const researchError = asResearchError(error);
    if (policy.mode === 'exclusive' || sources.some((source) => source.failureMode === 'strict')) {
      if (researchError) throw researchError;
      const message = error instanceof Error ? error.message : String(error);
      throw researchFailure(
        policy.sourceIds[0]!,
        'tool',
        /timeout/i.test(message) ? 'timeout' : 'unknown',
        message,
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    const runtimeFailures =
      researchError?.failures ??
      sources.map(
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
