<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# LobeHub authoring tools

These tools are available only if a personal authenticated Slides connector has been configured. The skill alone grants no access.

- Create a deck with typed slides, then use `get_deck_outputs` to check the native build and open its protected export while signed into Slides.
- Use the slide commands to edit one slide without replacing the rest. Fetch the latest revision before writing; do not replay a write whose outcome is unknown.
- For deletion, send the confirmation link to the human. Never attempt to perform browser confirmation on their behalf.
- Request permission before any costly draft, rebuild, visibility-affecting change or other write. Reconcile uncertain writes with list/read/status tools before considering a retry.
- If the connector is unavailable, preserve the local authoring workflow rather than inventing tools, credentials or public links.

| Tool | Effect | Use |
| --- | --- | --- |
| `create_deck` | Action | Save a deck and its typed slides in one call using the author’s default Slides organisation. The native build starts asynchronously. Return the deck ID and use get_deck_outputs to follow it. Only intentionally create an empty deck to prepare an IA draft. |
| `list_decks` | Read | List accessible decks with bounded pagination. Optionally match an exact slug. |
| `get_deck` | Read | Read deck metadata and authoring settings. Use the individual slide tools for content and get_deck_outputs for exports. |
| `update_deck` | Action | Change settings on an existing deck. To edit slides, use the slide commands instead. Does not change organisation or build metadata. |
| `request_deck_deletion` | Action | Prepare deletion of one deck if the role allows it. Give the link to the human to confirm or cancel in their own authenticated Slides browser session. |
| `get_deck_slides` | Read | List slides in an accessible deck or read one by its stable slide ID. Keep the revision for subsequent edits. |
| `manage_deck_slides` | Action | Insert, patch, move, or prepare deletion of a single slide. First read its current revision with get_deck_slides. Only the human can confirm deletion in Slides. |
| `get_deck_outputs` | Read | Check the latest native build, failure reason, and current protected artifact links. Open links in a browser with a Slides session. |
| `rebuild_deck` | Action | Queue a native regeneration for an existing deck. Use get_deck_outputs to observe completion. |
| `get_deck_variables` | Read | List the authorised variables and examples available to the deck. |
| `preview_slide` | Read | Generate a temporary native preview with an authenticated browser URL. Read only; does not save edits. |
| `revise_slide` | Action | Revise and save an existing slide through native IA, then queue a build. This changes the deck and consumes model resources; ask first. |
| `manage_slide_layout` | Action | Analyze, recommend, preview, apply or undo a native layout change. Apply and undo require a current fingerprint; use analyze before changing content. |
| `get_draft_sources` | Read | List authorised source options for a Mastra draft. |
| `start_deck_draft` | Action | Start the native durable Mastra draft for an existing deck ID and author-approved brief and sources. Keep the deck ID if the start fails; do not create a replacement. |
| `get_deck_draft` | Read | Read native Mastra progress and approval state for a draft run. |
| `control_deck_draft` | Action | Cancel, restart, resume after an explicit approval decision, or use an authorised native time-travel operation. |
| `list_fonts` | Read | Discover Google and bundled font families supported by Slides. |
| `list_brands` | Read | List accessible organisations and their deck brand settings. |
| `update_brand` | Action | Update branding for an authorised organisation. This affects decks that use the brand; obtain approval first. |
| `list_media` | Read | Find accessible uploaded assets to reuse by ID in slide image or brand logo fields. |
| `upload_media` | Action | Upload existing image or PDF bytes as a Slides media asset. Ordinary uploads are readable to other authenticated Slides users; use only content approved for this visibility. |
| `list_knowledge_bases` | Read | List organisation-scoped knowledge bases and their readiness for grounding. |
| `get_knowledge_base` | Read | Read a knowledge base and current readiness. |
| `create_knowledge_base` | Action | Create a knowledge base in the connector author’s sole organisation. |
| `update_knowledge_base` | Action | Rename an organisation knowledge base without changing access or indexing status. |
| `list_knowledge_documents` | Read | List authorised knowledge documents and indexing status; optionally match one base ID. |
| `get_knowledge_document` | Read | Read a knowledge document’s metadata and indexing status. |
| `upload_knowledge_document` | Action | Attach a supported file by bytes to an authorised knowledge base and enqueue native indexing. |
| `update_knowledge_document` | Action | Change a knowledge document’s base through the native access and indexing rules. |
| `request_knowledge_deletion` | Action | Prepare deletion of an authorised knowledge base or document. Give the link to the human to confirm or cancel in Slides. Deleting a base also deletes its documents. |
| `retry_knowledge_document` | Action | Request native indexing again for a failed, authorised document. |
