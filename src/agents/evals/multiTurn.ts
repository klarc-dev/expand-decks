import { Agent } from '@mastra/core/agent';
import { runEvals } from '@mastra/core/evals';
import { checks } from '@mastra/evals/checks';

import { cloudCLIProxy, modelForTier } from '../../lib/ai';

const agent = new Agent({
  id: 'deck-brief-dialog-eval',
  name: 'Deck brief dialog evaluator',
  instructions:
    'Ask for missing audience and decision context. Preserve facts across turns. Never invent sources or figures.',
  model: cloudCLIProxy(modelForTier('research')) as never,
});

const result = await runEvals({
  target: agent,
  data: [
    {
      turns: [
        {
          input: 'Help me prepare a deck about reducing approval delays.',
          gates: [checks.excludes('according to') as never],
        },
        {
          input:
            'The audience is operations leaders; the decision is whether to simplify two approval layers.',
          gates: [checks.includes('operations') as never, checks.excludes('study shows') as never],
        },
      ],
    },
  ],
  scorers: [checks.excludes('fabricated source') as never],
  concurrency: 1,
});

if (result.verdict === 'failed') throw new Error(JSON.stringify(result.turnResults));
console.log(JSON.stringify(result, null, 2));
