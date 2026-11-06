/*
 * Replacement for Emily's Cosmetic Labs presentation, ID 35.
 * Preview schema without a database: pnpm exec tsx scripts/seed-emily-cosmetic-labs.ts --check
 * Apply ONLY in an explicitly chosen environment: pnpm exec tsx --env-file-if-exists=.env scripts/seed-emily-cosmetic-labs.ts --apply
 * This script does not queue or run an export. Rebuild from the admin after review.
 *
 * Brief: directory visibility/SEO, project requests and provider proposals,
 * and on-platform messaging between service providers and ingredient suppliers.
 * Source pages inspected 2026-11-06. The existing document's explicit language
 * is English; preserve that choice and every field other than slides.
 */
import { parseArgs } from 'node:util';

import { AI_SLIDE_SCHEMA, SPEC_BY_TYPE } from '../src/blocks/spec';
import { fieldsOf } from '../src/blocks/spec/dsl';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import { slugFromTitle } from '../src/lib/slug';
import type { Presentation } from '../src/payload-types';

const PRESENTATION_ID = 35;
const ORGANISATION_ID = 9;
const TITLE = 'Presentation Cosmetic labs';
const SITE = 'https://cosmetic-labs.com';
const DIRECTORY = `${SITE}/companies`;
const PROVIDER = `${SITE}/world/europe/france/laboratoire-naturae`;
const SUPPLIER = `${SITE}/world/north-america/united-states/boc-sciences`;
const REQUEST = `${SITE}/requests/gel-polish-testing-laboratory-search-in-china`;

type DraftSlide = { blockType: string; title: string; [key: string]: unknown };
const source = (label: string, url: string) => ({ text: `[${label}](${url})` });

const pages: DraftSlide[] = [
  {
    blockType: 'cover',
    pills: [{ text: 'COSMETIC LABS' }, { text: 'PLATFORM OVERVIEW' }],
    title: 'Be found, find a partner, start a conversation',
    subtitle:
      'A practical route from a visible company profile to a relevant cosmetic-development enquiry.',
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'THE PLATFORM',
    title: 'One place to discover cosmetic-industry partners',
    sidebarText:
      'Browse company profiles and services, explore a map-based directory, or review published project requests.',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Discover',
        description: 'Search company listings by location and expertise.',
      },
      {
        number: '02',
        title: 'Specify',
        description: 'Explore service categories linked to company profiles and requests.',
      },
      {
        number: '03',
        title: 'Connect',
        description: 'Use request responses or company messaging to start a relevant exchange.',
      },
    ],
    footnotes: [source('Company directory', DIRECTORY), source('Request example', REQUEST)],
  },
  {
    blockType: 'twoCols',
    eyebrow: 'FOR SERVICE PROVIDERS · DISCOVERABILITY',
    title: 'A profile creates another relevant discovery surface',
    intro:
      'A company page can state your location, service categories and specific expertise where potential partners already browse for cosmetic-development support.',
    rightCards: [
      {
        title: 'More context than a name',
        description:
          'A representative profile shows a company description, location, service links and a contact action.',
      },
      {
        title: 'A grounded SEO opportunity',
        description:
          'A descriptive public page can add a relevant search entry point, subject to indexing and search relevance. It does not promise rankings or leads.',
      },
    ],
    leftFooter: 'Keep the profile accurate, specific and consistent with your own site.',
    footnotes: [source('Directory', DIRECTORY), source('Service-provider profile', PROVIDER)],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'FROM LISTING TO USEFUL PROFILE',
    title: 'Give the right partner enough to qualify you',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'What you do',
        description: 'Name the actual services and capabilities you offer.',
      },
      {
        number: '02',
        title: 'Where you operate',
        description: 'State your company location and relevant operating scope.',
      },
      {
        number: '03',
        title: 'How to reach you',
        description: 'Make the on-platform messaging entry point easy to find.',
      },
    ],
    footnotes: [source('Example company profile', PROVIDER)],
  },
  {
    blockType: 'twoCols',
    eyebrow: 'FOR PROJECT OWNERS · PUBLISH A REQUEST',
    title: 'Make a concrete need visible to suitable providers',
    intro:
      'A published request describes the project and links it to requested services. For example, a gel-polish testing enquiry seeks providers in China for physicochemical and safety-assessment work.',
    rightCards: [
      {
        title: 'Project owner',
        description: 'Publish a clear brief and select the relevant service categories.',
      },
      {
        title: 'Laboratory',
        description:
          'Read the public request and assess whether its capabilities fit before responding.',
      },
    ],
    leftFooter: 'The example page invites a signed-in company account to prepare a proposal.',
    footnotes: [source('Live request and response prompt', REQUEST)],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'FROM REQUEST TO PROPOSAL',
    title: 'A response workflow built around the brief',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'Review',
        description: 'Check the requested work, geography and project description.',
      },
      {
        number: '02',
        title: 'Sign in',
        description: 'Use a company account to access the proposal response.',
      },
      {
        number: '03',
        title: 'Propose',
        description: 'Prepare a service proposal suited to the stated request on the platform.',
      },
    ],
    footnotes: [source('Request response interface', REQUEST)],
  },
  {
    blockType: 'twoCols',
    eyebrow: 'DIRECT CONNECTIONS',
    title: 'Messaging also connects providers and suppliers',
    intro:
      'Company profiles for both a service provider and a raw-material supplier display an “Instant Messaging” contact action. This creates a direct on-platform route to discuss a potential fit.',
    rightCards: [
      {
        title: 'Service provider',
        description:
          'Open a relevant supplier profile and initiate contact about materials or capabilities.',
      },
      {
        title: 'Raw-material supplier',
        description:
          'Make your company profile informative so prospective partners can identify and message you.',
      },
    ],
    leftFooter: 'A request page also shows “Message the requester” alongside its proposal prompt.',
    footnotes: [
      source('Provider profile', PROVIDER),
      source('Supplier profile', SUPPLIER),
      source('Request page', REQUEST),
    ],
  },
  {
    blockType: 'cta',
    eyebrow: 'YOUR NEXT STEP',
    title: 'Put your expertise where projects take shape',
    subtitle:
      'Explore the directory, make your company profile specific, and respond to requests that genuinely match your capabilities.',
    primaryAction: 'Explore Cosmetic Labs',
    primaryActionUrl: DIRECTORY,
    footerNote: 'cosmetic-labs.com · Company directory, project requests and direct messaging',
    footnotes: [],
  },
];

function validatedSlides() {
  const ids = new Set<string>();
  return pages.map((slide, index) => {
    const parsed = AI_SLIDE_SCHEMA.safeParse(slide);
    if (!parsed.success) {
      throw new Error(`Slide ${index + 1}: ${JSON.stringify(parsed.error.issues)}`);
    }
    const id = `emily-cosmetic-labs-${slugFromTitle(slide.title)}`;
    if (ids.has(id)) throw new Error(`Duplicate slide ID: ${id}`);
    ids.add(id);
    const spec = SPEC_BY_TYPE.get(slide.blockType);
    if (!spec) throw new Error(`Unknown block: ${slide.blockType}`);
    const defaults = Object.fromEntries(
      fieldsOf(spec)
        .filter((field) => field.factory !== 'preview')
        .map((field) => [
          field.name,
          field.payload?.defaultValue ?? (field.payload?.type === 'array' ? [] : null),
        ]),
    );
    return { ...defaults, ...parsed.data, blockType: slide.blockType, layoutContent: null, id };
  });
}

const { values } = parseArgs({
  options: { check: { type: 'boolean' }, apply: { type: 'boolean' } },
});
if (values.check === values.apply) {
  throw new Error(
    'Choose exactly one mode: --check (no database) or --apply (update presentation 35).',
  );
}
const authored = validatedSlides();
if (values.check) {
  console.log(
    JSON.stringify(
      {
        id: PRESENTATION_ID,
        slides: authored.length,
        titles: pages.map(({ title }) => title),
        schema: 'valid',
      },
      null,
      2,
    ),
  );
} else {
  process.env.PAYLOAD_DB_PUSH = '0';
  process.env.PAYLOAD_RUN_JOBS_IN_PROCESS = '0';
  process.env.MASTRA_DISABLE_INIT = '1';
  const [
    { getPayload },
    { default: config },
    { closeScriptPayload },
    { convertSlidesMarkdownToLexical },
  ] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('./lib/payloadScript'),
    import('../src/lib/richTextWrite'),
  ]);
  const payload = await getPayload({ config, disableOnInit: true, cron: false });
  try {
    const existing = await payload.findByID({
      collection: 'presentations',
      id: PRESENTATION_ID,
      depth: 0,
      overrideAccess: true,
    });
    if (
      existing.title !== TITLE ||
      existing.slug !== 'presentation-cosmetic-labs' ||
      existing.documentTemplate !== 'presentation' ||
      existing.language !== 'en' ||
      existing.organisation !== ORGANISATION_ID
    ) {
      throw new Error(
        'Presentation 35 identity, template, language or organisation changed; refusing update.',
      );
    }
    const richSlides = await convertSlidesMarkdownToLexical(structuredClone(authored), payload);
    parseDocumentRenderPages(resolveDocumentTemplate(existing.documentTemplate), richSlides);
    const saved = await payload.update({
      collection: 'presentations',
      id: PRESENTATION_ID,
      data: { slides: richSlides as Presentation['slides'] },
      context: { skipBuildQueue: true },
      overrideAccess: true,
      depth: 0,
    });
    if (saved.slides?.length !== pages.length || saved.organisation !== ORGANISATION_ID) {
      throw new Error('Post-write slide count or organisation mismatch.');
    }
    console.log(
      `Updated presentation ${PRESENTATION_ID}: ${pages.length} slides. No build was queued.`,
    );
  } finally {
    await closeScriptPayload(payload);
  }
}
