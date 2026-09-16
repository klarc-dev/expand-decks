# Issue #45 resolution note

The slide-layout compatibility and mutation contract is implemented at the authenticated `POST /api/slide-layout` REST boundary and is shared with the admin preview.

The MCP portion of #45 is superseded by #66. The unreachable deck MCP server and its private routes were retired; they must not be restored. External integrations should call the canonical REST boundary, which provides analysis, preview, recommendation, atomic apply, stale rejection, explicit loss diagnostics, and undo.
