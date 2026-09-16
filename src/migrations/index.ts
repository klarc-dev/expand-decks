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
import * as migration_20260903_092452_pgvector_knowledge_schema from './20260903_092452_pgvector_knowledge_schema';
import * as migration_20260904_134932_simplify_knowledge_experience from './20260904_134932_simplify_knowledge_experience';
import * as migration_20260906_061027_add_knowledge_retrieval_version from './20260906_061027_add_knowledge_retrieval_version';
import * as migration_20260906_151740_knowledge_base_organisation from './20260906_151740_knowledge_base_organisation';
import * as migration_20260909_074031_agent_run_slide_count_range from './20260909_074031_agent_run_slide_count_range';
import * as migration_20260909_131019_document_template_foundation from './20260909_131019_document_template_foundation';
import * as migration_20260909_134008_generic_document_artifacts from './20260909_134008_generic_document_artifacts';
import * as migration_20260909_140127_linkedin_carousel from './20260909_140127_linkedin_carousel';
import * as migration_20260909_140201_issue_26_single_page_templates from './20260909_140201_issue_26_single_page_templates';
import * as migration_20260909_140837 from './20260909_140837';
import * as migration_20260909_141932 from './20260909_141932';
import * as migration_20260909_163216_spec19_linkedin_image_formats from './20260909_163216_spec19_linkedin_image_formats';
import * as migration_20260914_071233_agent_run_model from './20260914_071233_agent_run_model';
import * as migration_20260914_102932_ia_native_options from './20260914_102932_ia_native_options';
import * as migration_20260914_153409_org_logo_variants from './20260914_153409_org_logo_variants';
import * as migration_20260914_163506_contact_links from './20260914_163506_contact_links';
import * as migration_20260915_064138_content_lead from './20260915_064138_content_lead';
import * as migration_20260915_071722_twocols_lead from './20260915_071722_twocols_lead';
import * as migration_20260915_121029_cover_pills from './20260915_121029_cover_pills';
import * as migration_20260915_122318 from './20260915_122318';
import * as migration_20260915_123452_cover_pill_variant from './20260915_123452_cover_pill_variant';
import * as migration_20260915_124551 from './20260915_124551';
import * as migration_20260915_125015_quote_author_company from './20260915_125015_quote_author_company';
import * as migration_20260915_143541_two_cols_left_user_description from './20260915_143541_two_cols_left_user_description';
import * as migration_20260915_152850_add_two_cols_left_user_heading from './20260915_152850_add_two_cols_left_user_heading';
import * as migration_20260915_154407_drop_two_cols_left_user from './20260915_154407_drop_two_cols_left_user';
import * as migration_20260916_084523_issues_51_55_data_model_debloat from './20260916_084523_issues_51_55_data_model_debloat';
import * as migration_20260916_084906_issue_61_65_block_debloat from './20260916_084906_issue_61_65_block_debloat';
import * as migration_20260916_085705_remove_unreachable_producer_sources from './20260916_085705_remove_unreachable_producer_sources';
import * as migration_20260916_085921_single_cta from './20260916_085921_single_cta';
import * as migration_20260916_101917_slide_layout_content_12_blocks from './20260916_101917_slide_layout_content_12_blocks';

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
  {
    up: migration_20260903_092452_pgvector_knowledge_schema.up,
    down: migration_20260903_092452_pgvector_knowledge_schema.down,
    name: '20260903_092452_pgvector_knowledge_schema',
  },
  {
    up: migration_20260904_134932_simplify_knowledge_experience.up,
    down: migration_20260904_134932_simplify_knowledge_experience.down,
    name: '20260904_134932_simplify_knowledge_experience',
  },
  {
    up: migration_20260906_061027_add_knowledge_retrieval_version.up,
    down: migration_20260906_061027_add_knowledge_retrieval_version.down,
    name: '20260906_061027_add_knowledge_retrieval_version',
  },
  {
    up: migration_20260906_151740_knowledge_base_organisation.up,
    down: migration_20260906_151740_knowledge_base_organisation.down,
    name: '20260906_151740_knowledge_base_organisation',
  },
  {
    up: migration_20260909_074031_agent_run_slide_count_range.up,
    down: migration_20260909_074031_agent_run_slide_count_range.down,
    name: '20260909_074031_agent_run_slide_count_range',
  },
  {
    up: migration_20260909_131019_document_template_foundation.up,
    down: migration_20260909_131019_document_template_foundation.down,
    name: '20260909_131019_document_template_foundation',
  },
  {
    up: migration_20260909_134008_generic_document_artifacts.up,
    down: migration_20260909_134008_generic_document_artifacts.down,
    name: '20260909_134008_generic_document_artifacts',
  },
  {
    up: migration_20260909_140127_linkedin_carousel.up,
    down: migration_20260909_140127_linkedin_carousel.down,
    name: '20260909_140127_linkedin_carousel',
  },
  {
    up: migration_20260909_140201_issue_26_single_page_templates.up,
    down: migration_20260909_140201_issue_26_single_page_templates.down,
    name: '20260909_140201_issue_26_single_page_templates',
  },
  {
    up: migration_20260909_140837.up,
    down: migration_20260909_140837.down,
    name: '20260909_140837',
  },
  {
    up: migration_20260909_141932.up,
    down: migration_20260909_141932.down,
    name: '20260909_141932',
  },
  {
    up: migration_20260909_163216_spec19_linkedin_image_formats.up,
    down: migration_20260909_163216_spec19_linkedin_image_formats.down,
    name: '20260909_163216_spec19_linkedin_image_formats',
  },
  {
    up: migration_20260914_071233_agent_run_model.up,
    down: migration_20260914_071233_agent_run_model.down,
    name: '20260914_071233_agent_run_model',
  },
  {
    up: migration_20260914_102932_ia_native_options.up,
    down: migration_20260914_102932_ia_native_options.down,
    name: '20260914_102932_ia_native_options',
  },
  {
    up: migration_20260914_153409_org_logo_variants.up,
    down: migration_20260914_153409_org_logo_variants.down,
    name: '20260914_153409_org_logo_variants',
  },
  {
    up: migration_20260914_163506_contact_links.up,
    down: migration_20260914_163506_contact_links.down,
    name: '20260914_163506_contact_links',
  },
  {
    up: migration_20260915_064138_content_lead.up,
    down: migration_20260915_064138_content_lead.down,
    name: '20260915_064138_content_lead',
  },
  {
    up: migration_20260915_071722_twocols_lead.up,
    down: migration_20260915_071722_twocols_lead.down,
    name: '20260915_071722_twocols_lead',
  },
  {
    up: migration_20260915_121029_cover_pills.up,
    down: migration_20260915_121029_cover_pills.down,
    name: '20260915_121029_cover_pills',
  },
  {
    up: migration_20260915_122318.up,
    down: migration_20260915_122318.down,
    name: '20260915_122318',
  },
  {
    up: migration_20260915_123452_cover_pill_variant.up,
    down: migration_20260915_123452_cover_pill_variant.down,
    name: '20260915_123452_cover_pill_variant',
  },
  {
    up: migration_20260915_124551.up,
    down: migration_20260915_124551.down,
    name: '20260915_124551',
  },
  {
    up: migration_20260915_125015_quote_author_company.up,
    down: migration_20260915_125015_quote_author_company.down,
    name: '20260915_125015_quote_author_company',
  },
  {
    up: migration_20260915_143541_two_cols_left_user_description.up,
    down: migration_20260915_143541_two_cols_left_user_description.down,
    name: '20260915_143541_two_cols_left_user_description',
  },
  {
    up: migration_20260915_152850_add_two_cols_left_user_heading.up,
    down: migration_20260915_152850_add_two_cols_left_user_heading.down,
    name: '20260915_152850_add_two_cols_left_user_heading',
  },
  {
    up: migration_20260915_154407_drop_two_cols_left_user.up,
    down: migration_20260915_154407_drop_two_cols_left_user.down,
    name: '20260915_154407_drop_two_cols_left_user',
  },
  {
    up: migration_20260916_084523_issues_51_55_data_model_debloat.up,
    down: migration_20260916_084523_issues_51_55_data_model_debloat.down,
    name: '20260916_084523_issues_51_55_data_model_debloat',
  },
  {
    up: migration_20260916_084906_issue_61_65_block_debloat.up,
    down: migration_20260916_084906_issue_61_65_block_debloat.down,
    name: '20260916_084906_issue_61_65_block_debloat',
  },
  {
    up: migration_20260916_085705_remove_unreachable_producer_sources.up,
    down: migration_20260916_085705_remove_unreachable_producer_sources.down,
    name: '20260916_085705_remove_unreachable_producer_sources',
  },
  {
    up: migration_20260916_085921_single_cta.up,
    down: migration_20260916_085921_single_cta.down,
    name: '20260916_085921_single_cta',
  },
  {
    up: migration_20260916_101917_slide_layout_content_12_blocks.up,
    down: migration_20260916_101917_slide_layout_content_12_blocks.down,
    name: '20260916_101917_slide_layout_content_12_blocks',
  },
];
