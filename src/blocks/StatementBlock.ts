import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { statementSpec } from './spec/statement';

export const StatementBlock = emitPayloadBlock(statementSpec);
