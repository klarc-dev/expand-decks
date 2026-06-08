import * as migration_20260608_183203_richtext_fields from './20260608_183203_richtext_fields';
import * as migration_20260608_203955_org_and_footer from './20260608_203955_org_and_footer';

export const migrations = [
  {
    up: migration_20260608_183203_richtext_fields.up,
    down: migration_20260608_183203_richtext_fields.down,
    name: '20260608_183203_richtext_fields',
  },
  {
    up: migration_20260608_203955_org_and_footer.up,
    down: migration_20260608_203955_org_and_footer.down,
    name: '20260608_203955_org_and_footer'
  },
];
