import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { cardGridSpec } from './spec/cardGrid';

export const CardGridBlock = emitPayloadBlock(cardGridSpec);
