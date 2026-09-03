import * as migration_20260608_183203_richtext_fields from './20260608_183203_richtext_fields';
import * as migration_20260608_203955_org_and_footer from './20260608_203955_org_and_footer';
import * as migration_20260608_205627_build_requested_at from './20260608_205627_build_requested_at';
import * as migration_20260609_064938_mermaid_block from './20260609_064938_mermaid_block';
import * as migration_20260609_083115_agent_fields from './20260609_083115_agent_fields';
import * as migration_20260630_081854_add_cover_intervenants_user_profile from './20260630_081854_add_cover_intervenants_user_profile';
import * as migration_20260630_094458_remove_cover_footers from './20260630_094458_remove_cover_footers';
import * as migration_20260810_154621_add_user_membership_status from './20260810_154621_add_user_membership_status';
import * as migration_20260811_202948 from './20260811_202948';
import * as migration_20260811_205401 from './20260811_205401';
import * as migration_20260820_075122_add_user_default_organisation from './20260820_075122_add_user_default_organisation';
import * as migration_20260820_092404_native_user_api_keys from './20260820_092404_native_user_api_keys';
import * as migration_20260821_192342_add_agent_brief from './20260821_192342_add_agent_brief';
import * as migration_20260825_194323_agent_runs_durable_execution from './20260825_194323_agent_runs_durable_execution';
import * as migration_20260902_102706_exclusive_source_policy from './20260902_102706_exclusive_source_policy';
import * as migration_20260903_062510_org_membership from './20260903_062510_org_membership';
import * as migration_20260903_092420_knowledge_collections from './20260903_092420_knowledge_collections';

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
    name: '20260608_205627_build_requested_at',
  },
  {
    up: migration_20260609_064938_mermaid_block.up,
    down: migration_20260609_064938_mermaid_block.down,
    name: '20260609_064938_mermaid_block',
  },
  {
    up: migration_20260609_083115_agent_fields.up,
    down: migration_20260609_083115_agent_fields.down,
    name: '20260609_083115_agent_fields',
  },
  {
    up: migration_20260630_081854_add_cover_intervenants_user_profile.up,
    down: migration_20260630_081854_add_cover_intervenants_user_profile.down,
    name: '20260630_081854_add_cover_intervenants_user_profile',
  },
  {
    up: migration_20260630_094458_remove_cover_footers.up,
    down: migration_20260630_094458_remove_cover_footers.down,
    name: '20260630_094458_remove_cover_footers',
  },
  {
    up: migration_20260810_154621_add_user_membership_status.up,
    down: migration_20260810_154621_add_user_membership_status.down,
    name: '20260810_154621_add_user_membership_status',
  },
  {
    up: migration_20260811_202948.up,
    down: migration_20260811_202948.down,
    name: '20260811_202948',
  },
  {
    up: migration_20260811_205401.up,
    down: migration_20260811_205401.down,
    name: '20260811_205401',
  },
  {
    up: migration_20260820_075122_add_user_default_organisation.up,
    down: migration_20260820_075122_add_user_default_organisation.down,
    name: '20260820_075122_add_user_default_organisation',
  },
  {
    up: migration_20260820_092404_native_user_api_keys.up,
    down: migration_20260820_092404_native_user_api_keys.down,
    name: '20260820_092404_native_user_api_keys',
  },
  {
    up: migration_20260821_192342_add_agent_brief.up,
    down: migration_20260821_192342_add_agent_brief.down,
    name: '20260821_192342_add_agent_brief',
  },
  {
    up: migration_20260825_194323_agent_runs_durable_execution.up,
    down: migration_20260825_194323_agent_runs_durable_execution.down,
    name: '20260825_194323_agent_runs_durable_execution',
  },
  {
    up: migration_20260902_102706_exclusive_source_policy.up,
    down: migration_20260902_102706_exclusive_source_policy.down,
    name: '20260902_102706_exclusive_source_policy',
  },
  {
    up: migration_20260903_062510_org_membership.up,
    down: migration_20260903_062510_org_membership.down,
    name: '20260903_062510_org_membership',
  },
  {
    up: migration_20260903_092420_knowledge_collections.up,
    down: migration_20260903_092420_knowledge_collections.down,
    name: '20260903_092420_knowledge_collections',
  },
];
