import { knowledgeDeletionRequestSchema } from '@/lib/deckActionsContract';
import { requestDeletionConfirmation } from '@/lib/deletionConfirmationRequest';
import { prepareKnowledgeDeletion } from '@/lib/knowledgeDeletion';

export function POST(request: Request) {
  return requestDeletionConfirmation(
    request,
    knowledgeDeletionRequestSchema,
    (payload, user, input) => prepareKnowledgeDeletion({ payload, user, ...input }),
  );
}
