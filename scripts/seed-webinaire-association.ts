import { readFileSync } from 'node:fs';
import { isDeepStrictEqual, parseArgs } from 'node:util';

import { AI_SLIDE_SCHEMA, SPEC_BY_TYPE } from '../src/blocks/spec';
import { fieldsOf } from '../src/blocks/spec/dsl';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import type { Presentation } from '../src/payload-types';
import { slugFromTitle } from '../src/lib/slug';

import { pages, questions, slideId, TITLE } from './seed-assets/association';
const ORGANISATION = 'Klarc';
const TEMPLATE = resolveDocumentTemplate('presentation');

function validatedSlides() {
  const ids = new Set<string>();
  return pages.map((slide, index) => {
    const parsed = AI_SLIDE_SCHEMA.safeParse(slide);
    if (!parsed.success) {
      throw new Error(
        `Slide ${index + 1} « ${slide.title} » : ${JSON.stringify(parsed.error.issues)}`,
      );
    }
    const id = slideId(slide.title);
    if (ids.has(id)) throw new Error(`Identifiant de diapositive en doublon : ${id}`);
    ids.add(id);
    const spec = SPEC_BY_TYPE.get(slide.blockType)!;
    const defaults = Object.fromEntries(
      fieldsOf(spec)
        .filter((field) => field.factory !== 'preview')
        .map((field) => [
          field.name,
          field.payload?.defaultValue ?? (field.payload?.type === 'array' ? [] : null),
        ]),
    );
    return {
      ...defaults,
      ...parsed.data,
      ...(slide.blockType === 'agenda'
        ? {
            items: questions.map(({ label, description, target }) => {
              if (!pages.includes(target)) throw new Error(`Destination absente : ${label}`);
              return { label, description, slideId: slideId(target.title) };
            }),
          }
        : {}),
      blockType: slide.blockType,
      layoutContent: null,
      id,
    };
  });
}

function comparableContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparableContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, child]) => key !== 'id' && key !== 'blockName' && child != null)
        .map(([key, child]) => [key, comparableContent(child)]),
    );
  }
  return value;
}

const { values } = parseArgs({
  // run-seed.ts forwards the seed name as a positional argument.
  allowPositionals: true,
  options: {
    check: { type: 'boolean', default: false },
    inspect: { type: 'boolean', default: false },
    build: { type: 'boolean', default: false },
  },
});
const authored = validatedSlides();
if (values.check) {
  console.log(
    JSON.stringify(
      {
        title: TITLE,
        slides: authored.length,
        schema: 'valid',
        layouts: [...new Set(authored.map((slide) => slide.blockType))],
      },
      null,
      2,
    ),
  );
} else {
  process.env.PAYLOAD_DB_PUSH = '0';
  process.env.MASTRA_DISABLE_INIT = '1';
  const [{ getPayload }, { default: config }, { closeScriptPayload }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('./lib/payloadScript'),
  ]);
  const payload = await getPayload({ config, disableOnInit: true, cron: false });
  try {
    const organisations = await payload.find({
      collection: 'organisations',
      where: { name: { equals: ORGANISATION } },
      limit: 2,
      depth: 0,
      overrideAccess: true,
    });
    if (organisations.totalDocs !== 1)
      throw new Error(`Organisation ${ORGANISATION} introuvable ou ambiguë`);
    const organisation = organisations.docs[0]!;
    const existing = await payload.find({
      collection: 'presentations',
      where: { and: [{ title: { equals: TITLE } }, { organisation: { equals: organisation.id } }] },
      limit: 2,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.totalDocs > 1)
      throw new Error('Plusieurs présentations portent ce titre dans cette organisation');
    let presentation = existing.docs[0];
    if (!values.inspect) {
      const previousCover = presentation?.slides?.find((slide) => slide.blockType === 'cover');
      const speakers = await Promise.all(
        ['Joachim Brindeau', 'Benjamin Visser'].map(async (name) => {
          const members = await payload.find({
            collection: 'users',
            depth: 0,
            limit: 2,
            select: { name: true },
            where: {
              and: [{ name: { equals: name } }, { organisations: { contains: organisation.id } }],
            },
            overrideAccess: true,
          });
          if (members.totalDocs !== 1)
            throw new Error(`Intervenant Klarc absent ou ambigu : ${name}`);
          const user = members.docs[0]!.id;
          const prior = previousCover?.intervenants?.find((row) => row.user === user);
          return {
            ...prior,
            user,
            description:
              prior?.description ??
              (name === 'Benjamin Visser' ? 'Fiscalité de l’innovation' : null),
          };
        }),
      );
      const { convertSlidesMarkdownToLexical } = await import('../src/lib/richTextWrite');
      const richSlides = await convertSlidesMarkdownToLexical(structuredClone(authored), payload);
      const cover = richSlides.find((slide) => slide.blockType === 'cover') as
        | { intervenants?: unknown }
        | undefined;
      if (!cover) throw new Error('Couverture absente');
      cover.intervenants = speakers;
      parseDocumentRenderPages(TEMPLATE, richSlides);
      const data = {
        title: TITLE,
        slug: slugFromTitle(TITLE),
        organisation: organisation.id,
        documentTemplate: 'presentation' as const,
        language: 'fr' as const,
        agentBrief: 'Cas pratique de SAS : gouvernance, apports, droits, financement et départ.',
        slides: richSlides as Presentation['slides'],
      };
      presentation = presentation
        ? await payload.update({
            collection: 'presentations',
            id: presentation.id,
            data,
            context: { skipBuildQueue: true },
            overrideAccess: true,
            depth: 0,
          })
        : await payload.create({
            collection: 'presentations',
            data,
            context: { skipBuildQueue: true },
            overrideAccess: true,
            depth: 0,
          });
      const saved = await payload.findByID({
        collection: 'presentations',
        id: presentation.id,
        depth: 0,
        overrideAccess: true,
      });
      if (
        saved.organisation !== organisation.id ||
        saved.slides?.length !== pages.length ||
        saved.slides.some(
          (slide, index) => !('title' in slide) || slide.title !== pages[index]?.title,
        )
      ) {
        throw new Error('La relecture Payload ne correspond pas aux diapositives enregistrées');
      }
      if (
        !isDeepStrictEqual(
          comparableContent(parseDocumentRenderPages(TEMPLATE, saved.slides)),
          comparableContent(parseDocumentRenderPages(TEMPLATE, richSlides)),
        )
      ) {
        throw new Error('Le contenu relu contient des champs absents ou différents de la source');
      }
      console.log(
        `Présentation enregistrée et relue intégralement : ${presentation.id} (${pages.length} slides)`,
      );
      if (values.build) {
        const { runBuildSlidesTask } = await import('../src/jobs/buildSlidesRunner');
        const result = await runBuildSlidesTask({
          projectionStyles: readFileSync(
            new URL('./seed-assets/association/projection.css', import.meta.url),
            'utf8',
          ),
          input: { presentationId: String(presentation.id) },
          req: { payload },
        });
        if (!result.output.success)
          throw new Error(`Échec du build : ${JSON.stringify(result.output)}`);
      }
    }
    if (!presentation) throw new Error('La présentation n’existe pas encore');
    const result = await payload.findByID({
      collection: 'presentations',
      id: presentation.id,
      depth: 1,
      overrideAccess: true,
    });
    console.log(
      JSON.stringify(
        {
          id: result.id,
          title: result.title,
          slug: result.slug,
          slides: result.slides?.length,
          lastBuildStatus: result.lastBuildStatus,
          lastBuildError: result.lastBuildError,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closeScriptPayload(payload);
  }
  process.exit(process.exitCode ?? 0);
}
