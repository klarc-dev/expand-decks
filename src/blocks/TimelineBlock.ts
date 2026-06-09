import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { timelineSpec } from './spec/timeline';

export const TimelineBlock = emitPayloadBlock(timelineSpec);
