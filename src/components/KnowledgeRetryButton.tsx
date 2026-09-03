'use client';
// fallow-ignore-file unused-file -- referenced by Payload's generated admin import map

import React, { useState } from 'react';
import { Button, toast, useDocumentInfo } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';

import { adminPost } from '@/lib/adminFetch';

export default function KnowledgeRetryButton() {
  const { id } = useDocumentInfo();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  if (!id) return null;

  return (
    <Button
      buttonStyle="secondary"
      disabled={retrying}
      margin={false}
      onClick={async () => {
        setRetrying(true);
        try {
          const result = await adminPost(`/api/knowledge-documents/${id}/retry`);
          if (!result.ok)
            throw new Error(result.data.error || 'Impossible de relancer l’indexation.');
          toast.success('Réindexation mise en file.');
          router.refresh();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Impossible de relancer l’indexation.',
          );
        } finally {
          setRetrying(false);
        }
      }}
      size="small"
      type="button"
    >
      {retrying ? 'Relance…' : 'Relancer l’indexation'}
    </Button>
  );
}
