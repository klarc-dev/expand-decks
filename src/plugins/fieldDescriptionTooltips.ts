import type { Config, Field, Plugin } from 'payload';

const DESCRIPTION_COMPONENT = '/components/FieldTooltipDescription#default';

function withDescriptionTooltip(field: Field): Field {
  let next = field;

  if (
    'admin' in field &&
    field.admin &&
    'description' in field.admin &&
    field.admin.description &&
    (!field.admin.components ||
      !('Description' in field.admin.components) ||
      !field.admin.components.Description)
  ) {
    next = {
      ...field,
      admin: {
        ...field.admin,
        components: {
          ...field.admin.components,
          Description: DESCRIPTION_COMPONENT,
        },
      },
    } as Field;
  }

  if ('fields' in next && Array.isArray(next.fields)) {
    return { ...next, fields: next.fields.map(withDescriptionTooltip) } as Field;
  }

  if (next.type === 'tabs') {
    return {
      ...next,
      tabs: next.tabs.map((tab) =>
        'fields' in tab ? { ...tab, fields: tab.fields.map(withDescriptionTooltip) } : tab,
      ),
    } as Field;
  }

  if (next.type === 'blocks') {
    return {
      ...next,
      blocks: next.blocks.map((block) => ({
        ...block,
        fields: block.fields.map(withDescriptionTooltip),
      })),
    } as Field;
  }

  return next;
}

function mapConfigFields(config: Config): Config {
  return {
    ...config,
    collections: config.collections?.map((collection) => ({
      ...collection,
      fields: collection.fields.map(withDescriptionTooltip),
    })),
    globals: config.globals?.map((global) => ({
      ...global,
      fields: global.fields.map(withDescriptionTooltip),
    })),
  };
}

/** Render every standard field description as an accessible help tooltip. */
export const fieldDescriptionTooltips = (): Plugin => mapConfigFields;
