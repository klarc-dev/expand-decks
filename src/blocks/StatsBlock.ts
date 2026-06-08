import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { statsSpec } from './spec/stats';

export const StatsBlock = emitPayloadBlock(statsSpec);
