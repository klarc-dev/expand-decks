import * as migration_20260608_183203_richtext_fields from './20260608_183203_richtext_fields';

export const migrations = [
  {
    up: migration_20260608_183203_richtext_fields.up,
    down: migration_20260608_183203_richtext_fields.down,
    name: '20260608_183203_richtext_fields'
  },
];
