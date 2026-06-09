import { emitPayloadBlock } from './spec/emit/emitPayloadBlock';
import { agendaSpec } from './spec/agenda';

export const AgendaBlock = emitPayloadBlock(agendaSpec);
