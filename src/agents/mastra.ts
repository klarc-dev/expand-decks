/**
 * The Mastra container for the agentic deck builder.
 *
 * Registers the deck workflow so it can be retrieved with type inference via
 * `mastra.getWorkflow('deckWorkflow')` — the documented-preferred access path
 * (it wires the workflow to the instance's logger/telemetry and gives full
 * input/output type inference, unlike a direct import).
 */
import { Mastra } from '@mastra/core/mastra';

import { deckWorkflow } from './workflow';

export const mastra = new Mastra({
  workflows: { deckWorkflow },
});
