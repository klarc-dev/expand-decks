import sharp from 'sharp';

import {
  VISUAL_IMAGE_JPEG_QUALITY,
  VISUAL_IMAGE_MAX_BYTES,
  VISUAL_IMAGE_MAX_HEIGHT,
  VISUAL_IMAGE_MAX_WIDTH,
} from '../../lib/agentConfig';
import type { ImagePart } from '../model';

export type VisualImageBudget = {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly maxBytes: number;
  readonly jpegQuality: number;
};

export type BoundedVisualImage = ImagePart & {
  readonly mimeType: 'image/jpeg';
  readonly width: number;
  readonly height: number;
  readonly byteLength: number;
  readonly originalByteLength: number;
  readonly resized: boolean;
};

const DEFAULT_BUDGET = {
  maxWidth: VISUAL_IMAGE_MAX_WIDTH,
  maxHeight: VISUAL_IMAGE_MAX_HEIGHT,
  maxBytes: VISUAL_IMAGE_MAX_BYTES,
  jpegQuality: VISUAL_IMAGE_JPEG_QUALITY,
} as const satisfies VisualImageBudget;

const MIN_JPEG_QUALITY = 40;
const QUALITY_STEP = 10;
const DIMENSION_STEP = 0.85;
const MIN_DIMENSION = 64;

type SourceDimensions = {
  readonly width: number | undefined;
  readonly height: number | undefined;
};

type EncodePlan = {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly quality: number;
};

function mergeBudget(overrides: Partial<VisualImageBudget> | undefined): VisualImageBudget {
  return { ...DEFAULT_BUDGET, ...overrides };
}

function wasResized(
  source: SourceDimensions,
  budget: VisualImageBudget,
  result: SourceDimensions,
): boolean {
  return (
    (source.width ?? 0) > budget.maxWidth ||
    (source.height ?? 0) > budget.maxHeight ||
    (result.width ?? 0) < (source.width ?? 0) ||
    (result.height ?? 0) < (source.height ?? 0)
  );
}

async function encodeJpeg(buffer: Buffer, plan: EncodePlan): Promise<Buffer> {
  return sharp(buffer)
    .resize({
      width: plan.maxWidth,
      height: plan.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: plan.quality, mozjpeg: true })
    .toBuffer();
}

function shrinkDimension(value: number): number {
  return Math.max(MIN_DIMENSION, Math.floor(value * DIMENSION_STEP));
}

async function encodeWithinBudget(buffer: Buffer, budget: VisualImageBudget): Promise<Buffer> {
  let maxWidth = budget.maxWidth;
  let maxHeight = budget.maxHeight;

  while (maxWidth >= MIN_DIMENSION && maxHeight >= MIN_DIMENSION) {
    for (let quality = budget.jpegQuality; quality >= MIN_JPEG_QUALITY; quality -= QUALITY_STEP) {
      const encoded = await encodeJpeg(buffer, { maxWidth, maxHeight, quality });
      if (encoded.byteLength <= budget.maxBytes) return encoded;
    }

    if (maxWidth === MIN_DIMENSION && maxHeight === MIN_DIMENSION) break;
    maxWidth = shrinkDimension(maxWidth);
    maxHeight = shrinkDimension(maxHeight);
  }

  const encoded = await encodeJpeg(buffer, {
    maxWidth: MIN_DIMENSION,
    maxHeight: MIN_DIMENSION,
    quality: MIN_JPEG_QUALITY,
  });
  if (encoded.byteLength <= budget.maxBytes) return encoded;

  throw new VisualImageBudgetError(budget.maxBytes, encoded.byteLength);
}

class VisualImageBudgetError extends Error {
  constructor(
    readonly maxBytes: number,
    readonly actualBytes: number,
  ) {
    super(`Visual image cannot fit ${actualBytes} bytes into ${maxBytes} byte budget`);
    this.name = 'VisualImageBudgetError';
  }
}

export async function boundVisualImage(
  input: ImagePart,
  budgetOverrides?: Partial<VisualImageBudget>,
): Promise<BoundedVisualImage> {
  const budget = mergeBudget(budgetOverrides);
  const original = Buffer.from(input.base64, 'base64');
  const source = await sharp(original).metadata();
  const encoded = await encodeWithinBudget(original, budget);
  const result = await sharp(encoded).metadata();
  return {
    base64: encoded.toString('base64'),
    mimeType: 'image/jpeg',
    width: result.width ?? 0,
    height: result.height ?? 0,
    byteLength: encoded.byteLength,
    originalByteLength: original.byteLength,
    resized: wasResized(source, budget, result),
  };
}
