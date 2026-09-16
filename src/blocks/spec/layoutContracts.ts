import type { BlockSpec, LayoutAdapterContract } from './dsl';

const HEADER = { eyebrow: 'heading.eyebrow', title: 'heading.title' } as const;
const LEAD = { lead: 'prose.lead' } as const;

const LAYOUT_CONTRACTS = {
  cover: {
    kind: 'prose',
    fields: {
      pills: 'presentation.hint',
      pillVariant: 'presentation.hint',
      ...HEADER,
      subtitle: 'prose.support',
      intervenants: 'people',
      image: 'media.primary',
      imagePosition: 'media.placement',
    },
    required: ['heading.title'],
    media: { aspectRatio: '1/1', placements: ['left', 'right'] },
  },
  section: {
    kind: 'prose',
    fields: {
      number: 'heading.number',
      title: 'heading.title',
      subtitle: 'prose.support',
      image: 'media.primary',
      imagePosition: 'media.placement',
    },
    required: ['heading.title'],
    supportsCitations: true,
    media: { aspectRatio: '1/1', placements: ['left', 'right'] },
  },
  statement: {
    kind: 'prose',
    fields: { ...HEADER, body: 'prose.support', footer: 'takeaway', variant: 'presentation.hint' },
    required: ['heading.title'],
    supportsCitations: true,
  },
  twoCols: {
    kind: 'composition',
    fields: {
      ...HEADER,
      ...LEAD,
      intro: 'prose.support',
      leftFooter: 'takeaway',
      collectionSide: 'collection.side',
      rightCards: 'collection.items',
      image: 'media.primary',
      imagePosition: 'media.placement',
    },
    capacities: { 'collection.items': 5 },
    required: ['heading.title'],
    supportsCitations: true,
    media: { aspectRatio: '1/1', placements: ['left', 'right'] },
  },
  cardGrid: {
    kind: 'collection',
    fields: {
      ...HEADER,
      sidebarText: 'prose.support',
      columns: 'presentation.hint',
      cards: 'collection.items',
      intervenants: 'people',
    },
    capacities: { 'collection.items': 8 },
    required: ['heading.title', 'collection.items'],
    supportsCitations: true,
  },
  stats: {
    kind: 'collection',
    fields: { ...HEADER, ...LEAD, stats: 'collection.items' },
    capacities: { 'collection.items': 4 },
    required: ['heading.title', 'collection.items'],
    supportsCitations: true,
  },
  quotes: {
    kind: 'collection',
    fields: {
      ...HEADER,
      ...LEAD,
      quotes: 'collection.items',
      linkLabel: 'action.supporting.label',
      linkUrl: 'action.supporting.url',
    },
    capacities: { 'collection.items': 4 },
    required: ['heading.title', 'collection.items'],
    supportsCitations: true,
  },
  cta: {
    kind: 'prose',
    fields: {
      ...HEADER,
      subtitle: 'prose.support',
      primaryAction: 'action.primary.label',
      primaryActionUrl: 'action.primary.url',
      footerNote: 'takeaway',
    },
    required: ['heading.title'],
    supportsCitations: true,
  },
  table: {
    kind: 'specialized',
    fields: {
      ...HEADER,
      ...LEAD,
      tableVariant: 'presentation.hint',
      columns: 'table.columns',
      rows: 'table.rows',
    },
    required: ['heading.title', 'table.columns', 'table.rows'],
    supportsCitations: true,
  },
  timeline: {
    kind: 'collection',
    fields: { ...HEADER, ...LEAD, steps: 'collection.items', footer: 'takeaway' },
    capacities: { 'collection.items': 6 },
    required: ['heading.title', 'collection.items'],
    supportsCitations: true,
  },
  mermaid: {
    kind: 'specialized',
    fields: { ...HEADER, ...LEAD, source: 'diagram.source', caption: 'prose.support' },
    required: ['heading.title', 'diagram.source'],
    supportsCitations: true,
  },
  agenda: {
    kind: 'collection',
    fields: {
      ...HEADER,
      ...LEAD,
      items: 'collection.items',
      active: 'presentation.hint',
    },
    capacities: { 'collection.items': 8 },
    required: ['heading.title'],
    supportsCitations: true,
  },
} as const satisfies Record<string, LayoutAdapterContract>;

export function attachLayoutContract<T extends BlockSpec>(spec: T): T {
  const contract = LAYOUT_CONTRACTS[spec.blockType as keyof typeof LAYOUT_CONTRACTS];
  if (!contract) throw new Error(`Contrat de layout manquant : ${spec.blockType}`);
  spec.layout = contract;
  return spec;
}
