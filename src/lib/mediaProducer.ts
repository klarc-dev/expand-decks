import { z } from 'zod';

import { WRITABLE_SLIDE_SCHEMA } from '@/blocks/spec';

export const MEDIA_PRODUCER_ID = 'expand-decks' as const;
export const MEDIA_PRODUCER_VERSION = '1.0.0' as const;
const MEDIA_CAPABILITIES_CONTRACT = 'expand-decks.media-capabilities/1.0' as const;
const MEDIA_REQUEST_CONTRACT = 'expand-decks.media-request/1.0' as const;
export const MEDIA_RESULT_CONTRACT = 'expand-decks.media-result/1.0' as const;
export const LINKEDIN_DOCUMENT_CAROUSEL = 'linkedin_document_carousel' as const;
export const LINKEDIN_IMAGE = 'linkedin_image' as const;
export const LINKEDIN_MULTI_IMAGE = 'linkedin_multi_image' as const;
export const POSTIZ_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const POSTIZ_MIN_DOCUMENT_IMAGES = 2;

export const MEDIA_PRODUCER_STATUS = {
  queued: 'queued',
  building: 'building',
  succeeded: 'succeeded',
  failed: 'failed',
  stale: 'stale',
} as const;

export const REVIEW_STATUS = {
  pending: 'pending',
  passed: 'passed',
  failed: 'failed',
} as const;

const nullableLimit = z.number().int().positive().nullable();
const identity = z.union([z.string().trim().min(1).max(128), z.number().int().positive()]);
const payloadId = z.number().int().positive();

const MEDIA_PRODUCER_PAGE_SCHEMA = z.object({
  order: z.number().int().min(1),
  block: WRITABLE_SLIDE_SCHEMA,
  alt_text: z.string().trim().min(1).max(2000),
});

const TRANSPORT_BASE = {
  media_type: z.literal('image/png'),
  max_bytes_each: z.literal(POSTIZ_MAX_IMAGE_BYTES),
};

function requestShape<
  Format extends z.ZodLiteral<string>,
  Pages extends z.ZodArray<typeof MEDIA_PRODUCER_PAGE_SCHEMA>,
  Constraints extends z.ZodType,
>(intendedFormat: Format, pages: Pages, constraints: Constraints) {
  return {
    contract: z.literal(MEDIA_REQUEST_CONTRACT),
    publication_id: z.string().trim().min(1).max(200),
    revision_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    producer: z.literal(MEDIA_PRODUCER_ID),
    intended_format: intendedFormat,
    copy_relationship: z.literal('accompanies_caption'),
    presentation_id: payloadId.optional(),
    title: z.string().trim().min(1).max(200),
    language: z.enum(['fr', 'en']),
    organisation_id: payloadId,
    pages,
    accessibility: z.object({
      reading_order_required: z.boolean(),
      minimum_body_px: z.null(),
    }),
    constraints,
  };
}

const DOCUMENT_REQUEST_SCHEMA = z
  .object(
    requestShape(
      z.literal(LINKEDIN_DOCUMENT_CAROUSEL),
      z.array(MEDIA_PRODUCER_PAGE_SCHEMA).min(POSTIZ_MIN_DOCUMENT_IMAGES).max(100),
      z.object({
        delivery_pdf: z.object({
          media_type: z.literal('application/pdf'),
          max_bytes: nullableLimit,
          max_pages: nullableLimit,
        }),
        transport_images: z.object({
          ...TRANSPORT_BASE,
          minimum_count: z.literal(POSTIZ_MIN_DOCUMENT_IMAGES),
        }),
      }),
    ),
  )
  .strict();

const SINGLE_IMAGE_REQUEST_SCHEMA = z
  .object(
    requestShape(
      z.literal(LINKEDIN_IMAGE),
      z.array(MEDIA_PRODUCER_PAGE_SCHEMA).length(1),
      z.object({
        delivery_pdf: z.null(),
        transport_images: z.object({
          ...TRANSPORT_BASE,
          minimum_count: z.literal(1),
          maximum_count: z.literal(1),
        }),
      }),
    ),
  )
  .strict();

const MULTI_IMAGE_REQUEST_SCHEMA = z
  .object(
    requestShape(
      z.literal(LINKEDIN_MULTI_IMAGE),
      z.array(MEDIA_PRODUCER_PAGE_SCHEMA).min(2),
      z.object({
        delivery_pdf: z.null(),
        transport_images: z.object({
          ...TRANSPORT_BASE,
          minimum_count: z.literal(2),
          maximum_count: z.null(),
        }),
      }),
    ),
  )
  .strict();

export const MEDIA_PRODUCER_REQUEST_SCHEMA = z
  .discriminatedUnion('intended_format', [
    DOCUMENT_REQUEST_SCHEMA,
    SINGLE_IMAGE_REQUEST_SCHEMA,
    MULTI_IMAGE_REQUEST_SCHEMA,
  ])
  .superRefine((request, context) => {
    request.pages.forEach((page, index) => {
      if (page.order !== index + 1) {
        context.addIssue({
          code: 'custom',
          path: ['pages', index, 'order'],
          message: 'Page orders must be contiguous and start at 1',
        });
      }
    });
  });

const MEDIA_PRODUCER_PDF_ARTIFACT_SCHEMA = z.object({
  order: z.number().int().positive(),
  role: z.literal('delivery_document'),
  handle: identity,
  media_type: z.literal('application/pdf'),
  bytes: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  page_count: z.number().int().positive(),
  width_px: z.number().int().positive(),
  height_px: z.number().int().positive(),
});

const IMAGE_ARTIFACT_BASE = {
  order: z.number().int().positive(),
  handle: identity,
  media_type: z.literal('image/png'),
  bytes: z.number().int().positive().max(POSTIZ_MAX_IMAGE_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  page_count: z.literal(1),
  width_px: z.number().int().positive(),
  height_px: z.number().int().positive(),
  alt_text: z.string().trim().min(1).max(2000),
};

const MEDIA_PRODUCER_DOCUMENT_IMAGE_ARTIFACT_SCHEMA = z.object({
  ...IMAGE_ARTIFACT_BASE,
  role: z.literal('postiz_document_page'),
});

const MEDIA_PRODUCER_SINGLE_IMAGE_ARTIFACT_SCHEMA = z.object({
  ...IMAGE_ARTIFACT_BASE,
  role: z.literal('postiz_image'),
});

const MEDIA_PRODUCER_MULTI_IMAGE_ARTIFACT_SCHEMA = z.object({
  ...IMAGE_ARTIFACT_BASE,
  role: z.literal('postiz_multi_image'),
});

const MEDIA_PRODUCER_IMAGE_ARTIFACT_SCHEMA = z.discriminatedUnion('role', [
  MEDIA_PRODUCER_DOCUMENT_IMAGE_ARTIFACT_SCHEMA,
  MEDIA_PRODUCER_SINGLE_IMAGE_ARTIFACT_SCHEMA,
  MEDIA_PRODUCER_MULTI_IMAGE_ARTIFACT_SCHEMA,
]);

const MEDIA_PRODUCER_ARTIFACT_SCHEMA = z.discriminatedUnion('role', [
  MEDIA_PRODUCER_PDF_ARTIFACT_SCHEMA,
  MEDIA_PRODUCER_IMAGE_ARTIFACT_SCHEMA,
]);

const MEDIA_PRODUCER_ADAPTER_SCHEMA = z.discriminatedUnion('route', [
  z.object({
    provider: z.literal('postiz'),
    route: z.literal('linkedin_images_to_document'),
    settings: z.object({
      post_as_images_carousel: z.literal(true),
      carousel_name: z.string().trim().min(1).max(200),
    }),
  }),
  z.object({
    provider: z.literal('postiz'),
    route: z.literal(LINKEDIN_IMAGE),
    settings: z.object({}).strict(),
  }),
  z.object({
    provider: z.literal('postiz'),
    route: z.literal(LINKEDIN_MULTI_IMAGE),
    settings: z.object({}).strict(),
  }),
]);

export const MEDIA_PRODUCER_RESULT_SCHEMA = z
  .object({
    contract: z.literal(MEDIA_RESULT_CONTRACT),
    producer: z.literal(MEDIA_PRODUCER_ID),
    producer_version: z.literal(MEDIA_PRODUCER_VERSION),
    request_id: z.string().uuid(),
    publication_id: z.string().trim().min(1).max(200),
    revision_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    presentation_id: identity,
    status: z.enum(MEDIA_PRODUCER_STATUS),
    delivery_artifacts: z.array(MEDIA_PRODUCER_PDF_ARTIFACT_SCHEMA),
    transport_artifacts: z.array(MEDIA_PRODUCER_IMAGE_ARTIFACT_SCHEMA),
    adapter: MEDIA_PRODUCER_ADAPTER_SCHEMA.nullable(),
    validation: z.object({
      layout: z.enum(REVIEW_STATUS),
      visual_review: z.enum(REVIEW_STATUS),
      editorial_review: z.enum(REVIEW_STATUS),
    }),
    error: z
      .object({
        code: z.string().trim().min(1).max(100),
        message: z.string().trim().min(1).max(5000),
      })
      .nullable(),
  })
  .strict()
  .superRefine((result, context) => {
    const validationIsPending = Object.values(result.validation).every(
      (status) => status === REVIEW_STATUS.pending,
    );
    if (result.status === MEDIA_PRODUCER_STATUS.succeeded) {
      const transportOrders = result.transport_artifacts.map((artifact) => artifact.order);
      const artifactHandles = [...result.delivery_artifacts, ...result.transport_artifacts].map(
        (artifact) => String(artifact.handle),
      );
      const [firstTransport] = result.transport_artifacts;
      const geometryMatches = result.transport_artifacts.every(
        (artifact) =>
          artifact.width_px === firstTransport?.width_px &&
          artifact.height_px === firstTransport?.height_px,
      );
      const commonSuccess =
        transportOrders.every((order, index) => order === index + 1) &&
        new Set(artifactHandles).size === artifactHandles.length &&
        geometryMatches &&
        result.adapter !== null &&
        result.validation.layout === REVIEW_STATUS.passed &&
        result.error === null;
      const documentSuccess =
        result.adapter?.route === 'linkedin_images_to_document' &&
        result.delivery_artifacts.length === 1 &&
        result.transport_artifacts.length >= POSTIZ_MIN_DOCUMENT_IMAGES &&
        result.transport_artifacts.every((artifact) => artifact.role === 'postiz_document_page') &&
        result.delivery_artifacts[0]?.page_count === result.transport_artifacts.length;
      const singleImageSuccess =
        result.adapter?.route === LINKEDIN_IMAGE &&
        result.delivery_artifacts.length === 0 &&
        result.transport_artifacts.length === 1 &&
        result.transport_artifacts[0]?.role === 'postiz_image';
      const multiImageSuccess =
        result.adapter?.route === LINKEDIN_MULTI_IMAGE &&
        result.delivery_artifacts.length === 0 &&
        result.transport_artifacts.length >= 2 &&
        result.transport_artifacts.every((artifact) => artifact.role === 'postiz_multi_image');
      if (!commonSuccess || (!documentSuccess && !singleImageSuccess && !multiImageSuccess)) {
        context.addIssue({
          code: 'custom',
          path: ['transport_artifacts'],
          message: 'Succeeded results require the exact ordered artifacts for their Postiz route',
        });
      }
    } else if (
      result.delivery_artifacts.length !== 0 ||
      result.transport_artifacts.length !== 0 ||
      result.adapter !== null ||
      !validationIsPending
    ) {
      context.addIssue({
        code: 'custom',
        path: ['delivery_artifacts'],
        message: 'Non-success results require pending validation and no ready artifacts',
      });
    } else if (
      (result.status === MEDIA_PRODUCER_STATUS.queued ||
        result.status === MEDIA_PRODUCER_STATUS.building) &&
      result.error !== null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['error'],
        message: 'Pending results cannot expose an error',
      });
    } else if (
      (result.status === MEDIA_PRODUCER_STATUS.failed ||
        result.status === MEDIA_PRODUCER_STATUS.stale) &&
      result.error === null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['error'],
        message: 'Failed and stale results require an error',
      });
    }
  });

export type MediaProducerRequest = z.infer<typeof MEDIA_PRODUCER_REQUEST_SCHEMA>;
export type MediaProducerResult = z.infer<typeof MEDIA_PRODUCER_RESULT_SCHEMA>;
export type MediaProducerArtifact = z.infer<typeof MEDIA_PRODUCER_ARTIFACT_SCHEMA>;
export type MediaProducerPdfArtifact = z.infer<typeof MEDIA_PRODUCER_PDF_ARTIFACT_SCHEMA>;
export type MediaProducerImageArtifact = z.infer<typeof MEDIA_PRODUCER_IMAGE_ARTIFACT_SCHEMA>;

export type MediaProducerIdentity = Pick<
  MediaProducerResult,
  'request_id' | 'publication_id' | 'revision_sha256' | 'presentation_id'
>;

export function pendingMediaProducerResult(
  identityFields: MediaProducerIdentity,
  status: typeof MEDIA_PRODUCER_STATUS.queued | typeof MEDIA_PRODUCER_STATUS.building,
): MediaProducerResult {
  return {
    contract: MEDIA_RESULT_CONTRACT,
    producer: MEDIA_PRODUCER_ID,
    producer_version: MEDIA_PRODUCER_VERSION,
    ...identityFields,
    status,
    delivery_artifacts: [],
    transport_artifacts: [],
    adapter: null,
    validation: {
      layout: REVIEW_STATUS.pending,
      visual_review: REVIEW_STATUS.pending,
      editorial_review: REVIEW_STATUS.pending,
    },
    error: null,
  };
}

export function terminalMediaProducerResult(
  identityFields: MediaProducerIdentity,
  status: typeof MEDIA_PRODUCER_STATUS.failed | typeof MEDIA_PRODUCER_STATUS.stale,
  code: string,
  message: string,
): MediaProducerResult {
  return {
    ...pendingMediaProducerResult(identityFields, MEDIA_PRODUCER_STATUS.building),
    status,
    error: { code, message },
  };
}

let capabilitiesCache: ReturnType<typeof buildMediaProducerCapabilities> | undefined;

function buildMediaProducerCapabilities() {
  return {
    contract: MEDIA_CAPABILITIES_CONTRACT,
    producer: MEDIA_PRODUCER_ID,
    producer_version: MEDIA_PRODUCER_VERSION,
    request_contract: MEDIA_REQUEST_CONTRACT,
    result_contract: MEDIA_RESULT_CONTRACT,
    formats: {
      linkedin_document_carousel: {
        status: 'supported',
        delivery: {
          media_type: 'application/pdf',
          artifact_role: 'delivery_document',
          outputs: 1,
        },
        transport: {
          media_type: 'image/png',
          artifact_role: 'postiz_document_page',
          outputs: 'one_per_page',
        },
        adapter: {
          provider: 'postiz',
          route: 'linkedin_images_to_document',
          settings: { post_as_images_carousel: true },
        },
        constraints: {
          minimum_images: POSTIZ_MIN_DOCUMENT_IMAGES,
          max_bytes_each_image: POSTIZ_MAX_IMAGE_BYTES,
          max_pages: null,
          page_width_px: null,
          page_height_px: null,
        },
      },
      linkedin_image: {
        status: 'supported',
        delivery: null,
        transport: {
          media_type: 'image/png',
          artifact_role: 'postiz_image',
          outputs: 1,
        },
        adapter: {
          provider: 'postiz',
          route: LINKEDIN_IMAGE,
          settings: {},
        },
        constraints: {
          minimum_images: 1,
          maximum_images: 1,
          max_bytes_each_image: POSTIZ_MAX_IMAGE_BYTES,
          image_width_px: null,
          image_height_px: null,
        },
      },
      linkedin_multi_image: {
        status: 'supported',
        delivery: null,
        transport: {
          media_type: 'image/png',
          artifact_role: 'postiz_multi_image',
          outputs: 'one_per_page',
        },
        adapter: {
          provider: 'postiz',
          route: LINKEDIN_MULTI_IMAGE,
          settings: {},
        },
        constraints: {
          minimum_images: 2,
          maximum_images: null,
          max_bytes_each_image: POSTIZ_MAX_IMAGE_BYTES,
          image_width_px: null,
          image_height_px: null,
        },
      },
      video: { status: 'unsupported' },
    },
    request_schema: z.toJSONSchema(MEDIA_PRODUCER_REQUEST_SCHEMA, { target: 'draft-2020-12' }),
    result_schema: z.toJSONSchema(MEDIA_PRODUCER_RESULT_SCHEMA, { target: 'draft-2020-12' }),
    slide_schema: z.toJSONSchema(WRITABLE_SLIDE_SCHEMA, { target: 'draft-2020-12' }),
  } as const;
}

export function mediaProducerImageRole(
  format: MediaProducerRequest['intended_format'],
): MediaProducerImageArtifact['role'] {
  if (format === LINKEDIN_IMAGE) return 'postiz_image';
  if (format === LINKEDIN_MULTI_IMAGE) return 'postiz_multi_image';
  return 'postiz_document_page';
}

export function mediaProducerDocumentTemplate(
  format: MediaProducerRequest['intended_format'],
): 'visual-publication' | 'linkedin-carousel' | undefined {
  if (format === LINKEDIN_IMAGE) return 'visual-publication';
  if (format === LINKEDIN_MULTI_IMAGE) return 'linkedin-carousel';
  return undefined;
}

export function succeededMediaProducerResult(
  identityFields: MediaProducerIdentity,
  request: MediaProducerRequest,
  deliveryArtifacts: MediaProducerPdfArtifact[],
  transportArtifacts: MediaProducerImageArtifact[],
): MediaProducerResult {
  const adapter =
    request.intended_format === LINKEDIN_DOCUMENT_CAROUSEL
      ? {
          provider: 'postiz' as const,
          route: 'linkedin_images_to_document' as const,
          settings: {
            post_as_images_carousel: true as const,
            carousel_name: request.title,
          },
        }
      : {
          provider: 'postiz' as const,
          route: request.intended_format,
          settings: {},
        };
  return MEDIA_PRODUCER_RESULT_SCHEMA.parse({
    contract: MEDIA_RESULT_CONTRACT,
    producer: MEDIA_PRODUCER_ID,
    producer_version: MEDIA_PRODUCER_VERSION,
    ...identityFields,
    status: MEDIA_PRODUCER_STATUS.succeeded,
    delivery_artifacts: deliveryArtifacts,
    transport_artifacts: transportArtifacts,
    adapter,
    validation: {
      layout: REVIEW_STATUS.passed,
      visual_review: REVIEW_STATUS.pending,
      editorial_review: REVIEW_STATUS.pending,
    },
    error: null,
  });
}

export function mediaProducerRelationshipId(value: unknown): unknown {
  return value && typeof value === 'object' ? (value as { id?: unknown }).id : value;
}

export function mediaProducerCapabilities() {
  capabilitiesCache ??= buildMediaProducerCapabilities();
  return capabilitiesCache;
}

export function presentationMatchesMediaRequest(
  presentation: Record<string, unknown>,
  request: MediaProducerRequest,
): boolean {
  const expectedTemplate = mediaProducerDocumentTemplate(request.intended_format);
  if (
    presentation.title !== request.title ||
    presentation.language !== request.language ||
    (expectedTemplate !== undefined && presentation.documentTemplate !== expectedTemplate) ||
    String(mediaProducerRelationshipId(presentation.organisation)) !==
      String(request.organisation_id)
  ) {
    return false;
  }
  const slides = Array.isArray(presentation.slides) ? presentation.slides : [];
  if (slides.length !== request.pages.length) return false;
  const parsedSlides = z.array(WRITABLE_SLIDE_SCHEMA).safeParse(slides);
  return (
    parsedSlides.success &&
    JSON.stringify(parsedSlides.data) === JSON.stringify(request.pages.map((page) => page.block))
  );
}

export function artifactMatchesMediaRecord(
  result: MediaProducerResult,
  artifact: MediaProducerArtifact,
  media: Record<string, unknown>,
  requestRecordId?: string | number,
): boolean {
  if (result.status !== MEDIA_PRODUCER_STATUS.succeeded) return false;
  const mediaRequestId = mediaProducerRelationshipId(media.mediaProductionRequest);
  if (String(mediaRequestId) === '') return false;
  if (requestRecordId !== undefined && String(mediaRequestId) !== String(requestRecordId)) {
    return false;
  }
  const artifactGroup = artifact.role === 'delivery_document' ? 'delivery' : 'transport';
  const expectedFields: Record<string, unknown> = {
    producerContract: MEDIA_RESULT_CONTRACT,
    producerRequestId: result.request_id,
    publicationId: result.publication_id,
    revisionSha256: result.revision_sha256,
    artifactOrder: artifact.order,
    artifactGroup,
    artifactRole: artifact.role,
    artifactMediaType: artifact.media_type,
    artifactBytes: artifact.bytes,
    artifactSha256: artifact.sha256,
    artifactPageCount: artifact.page_count,
    artifactWidthPx: artifact.width_px,
    artifactHeightPx: artifact.height_px,
  };
  if (!Object.entries(expectedFields).every(([field, value]) => media[field] === value)) {
    return false;
  }
  if (artifact.role !== 'delivery_document' && media.alt !== artifact.alt_text) return false;
  return String(media.id) === String(artifact.handle);
}
