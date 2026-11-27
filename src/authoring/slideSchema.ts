import { z } from 'zod';
import { payloadBlocksForTemplate } from '../documents/payload';
import { payloadBlockSchema } from './payloadSchema';

const [first, ...remaining] = payloadBlocksForTemplate();
if (!first) throw new Error('No slide blocks configured');

export const slideInputSchema = z.discriminatedUnion('blockType', [
  payloadBlockSchema(first),
  ...remaining.map((block) => payloadBlockSchema(block)),
]);

export const slidePatchSchema = z.discriminatedUnion('blockType', [
  payloadBlockSchema(first, true),
  ...remaining.map((block) => payloadBlockSchema(block, true)),
]);
