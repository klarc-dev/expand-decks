import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';
import { getDocumentProxy } from 'unpdf';

import {
  POSTIZ_MAX_IMAGE_BYTES,
  POSTIZ_MIN_DOCUMENT_IMAGES,
  type MediaProducerArtifact,
  type MediaProducerImageArtifact,
  type MediaProducerPdfArtifact,
  type MediaProducerRequest,
} from './mediaProducer';
import { MEDIA_DIR } from './paths';

export class MediaProducerConstraintError extends Error {
  // Read through a narrowed Error instance in the build runner.
  // fallow-ignore-next-line unused-class-member
  code = 'constraint_violation' as const;
}

export async function measurePdfArtifact(
  buffer: Buffer,
  handle: string | number,
): Promise<MediaProducerPdfArtifact> {
  if (buffer.byteLength === 0 || !buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('Slidev output is not a readable PDF');
  }

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  if (pdf.numPages < 1) throw new Error('Slidev output contains no PDF pages');

  let widthPx = 0;
  let heightPx = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 96 / 72 });
    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);
    if (pageNumber === 1) {
      widthPx = width;
      heightPx = height;
    } else if (width !== widthPx || height !== heightPx) {
      throw new Error('PDF pages do not have consistent dimensions');
    }
  }

  return {
    order: 1,
    role: 'delivery_document',
    handle,
    media_type: 'application/pdf',
    bytes: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    page_count: pdf.numPages,
    width_px: widthPx,
    height_px: heightPx,
  };
}

export async function measurePngArtifact(
  buffer: Buffer,
  handle: string | number,
  order: number,
  altText: string,
): Promise<MediaProducerImageArtifact> {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.byteLength === 0 || !buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`Slidev output for page ${order} is not a readable PNG`);
  }
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) {
    throw new Error(`Slidev output for page ${order} has no measurable PNG geometry`);
  }
  return {
    order,
    role: 'postiz_document_page',
    handle,
    media_type: 'image/png',
    bytes: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    page_count: 1,
    width_px: metadata.width,
    height_px: metadata.height,
    alt_text: altText,
  };
}

export function assertPdfConstraints(
  artifact: MediaProducerPdfArtifact,
  constraints: MediaProducerRequest['constraints']['delivery_pdf'],
): void {
  if (constraints.max_bytes !== null && artifact.bytes > constraints.max_bytes) {
    throw new MediaProducerConstraintError(
      `PDF is ${artifact.bytes} bytes, above max_bytes ${constraints.max_bytes}`,
    );
  }
  if (constraints.max_pages !== null && artifact.page_count > constraints.max_pages) {
    throw new MediaProducerConstraintError(
      `PDF has ${artifact.page_count} pages, above max_pages ${constraints.max_pages}`,
    );
  }
}

export function assertTransportConstraints(
  artifacts: MediaProducerImageArtifact[],
  constraints: MediaProducerRequest['constraints']['transport_images'],
): void {
  if (
    artifacts.length < POSTIZ_MIN_DOCUMENT_IMAGES ||
    artifacts.length < constraints.minimum_count
  ) {
    throw new MediaProducerConstraintError(
      `Postiz document transport requires at least ${POSTIZ_MIN_DOCUMENT_IMAGES} images`,
    );
  }
  const first = artifacts[0];
  for (const [index, artifact] of artifacts.entries()) {
    if (artifact.order !== index + 1) {
      throw new MediaProducerConstraintError('Transport image orders must be contiguous');
    }
    if (artifact.bytes > POSTIZ_MAX_IMAGE_BYTES || artifact.bytes > constraints.max_bytes_each) {
      throw new MediaProducerConstraintError(
        `PNG page ${artifact.order} is ${artifact.bytes} bytes, above max_bytes_each ${constraints.max_bytes_each}`,
      );
    }
    if (artifact.width_px !== first?.width_px || artifact.height_px !== first?.height_px) {
      throw new MediaProducerConstraintError('Transport images do not have consistent dimensions');
    }
  }
}

export async function artifactFileMatches(
  artifact: MediaProducerArtifact,
  media: Record<string, unknown>,
): Promise<boolean> {
  if (typeof media.filename !== 'string') return false;
  const path = join(MEDIA_DIR, media.filename);
  let file;
  try {
    file = await open(path, 'r');
    if ((await file.stat()).size !== artifact.bytes) return false;
    const hash = createHash('sha256');
    for await (const chunk of file.createReadStream({ autoClose: false })) hash.update(chunk);
    return hash.digest('hex') === artifact.sha256;
  } catch {
    return false;
  } finally {
    await file?.close();
  }
}
