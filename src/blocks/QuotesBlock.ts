import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { quotesSpec } from './spec/quotes';

export const QuotesBlock = emitPayloadBlock(quotesSpec);
