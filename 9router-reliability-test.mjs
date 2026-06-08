// Verify our tool-calling + stream:false solution holds across every model an
// OmniRoute combo would rotate through (the resilience layer just swaps upstream
// behind the same wire contract). Run each twice to confirm stability.
import { ALL_SPECS } from './src/blocks/spec/index.ts';
import { emitSlidesArraySchema } from './src/blocks/spec/emit/emitDraftSchema.ts';
import { buildSystemPrompt } from './src/blocks/spec/emit/emitPromptSection.ts';
import { draftObject } from './src/lib/ai.ts';

const schema = emitSlidesArraySchema(ALL_SPECS);
const system = buildSystemPrompt(ALL_SPECS.flatMap((s)=> s.promptMeta ? [s.promptMeta] : []));
const prompt = 'Pitch deck pour une marketplace B2B de pièces détachées automobiles.';

async function go(model, run){
  const t0 = Date.now();
  try {
    const obj = await draftObject({ model, schema, system, prompt });
    const ms = Date.now()-t0;
    return `[${model} #${run}] OK ${ms}ms n=${obj.slides.length} first=${obj.slides[0]?.blockType} last=${obj.slides.at(-1)?.blockType}`;
  } catch(e){ return `[${model} #${run}] FAIL: ${(e?.message||e).slice(0,120)}`; }
}
// Every model a paid combo (priority/auto) would fall through on this gateway.
const models = ['cc/claude-opus-4-8','cc/claude-sonnet-4-6','cx/gpt-5.5','cx/gpt-5.4-mini','ds/deepseek-v4-pro'];
for (const m of models) for (const run of [1,2]) console.log(await go(m, run));
