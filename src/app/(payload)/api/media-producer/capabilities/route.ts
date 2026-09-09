import { NextResponse } from 'next/server';

import { mediaProducerCapabilities } from '@/lib/mediaProducer';

export function GET() {
  return NextResponse.json(mediaProducerCapabilities());
}
