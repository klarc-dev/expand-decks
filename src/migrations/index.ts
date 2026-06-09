import * as migration_20260608_183203_richtext_fields from './20260608_183203_richtext_fields';
import * as migration_20260608_203955_org_and_footer from './20260608_203955_org_and_footer';
import * as migration_20260608_205627_build_requested_at from './20260608_205627_build_requested_at';

export const migrations = [
  {
    up: migration_20260608_183203_richtext_fields.up,
    down: migration_20260608_183203_richtext_fields.down,
    name: '20260608_183203_richtext_fields',
  },
  {
    up: migration_20260608_203955_org_and_footer.up,
    down: migration_20260608_203955_org_and_footer.down,
    name: '20260608_203955_org_and_footer',
  },
  {
    up: migration_20260608_205627_build_requested_at.up,
    down: migration_20260608_205627_build_requested_at.down,
    name: '20260608_205627_build_requested_at'
  },
];
