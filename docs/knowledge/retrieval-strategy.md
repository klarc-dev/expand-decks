# Retrieval strategy decision: hybrid-v2

Issue #20 is evaluation-led. The production strategy remains direct hybrid retrieval:

- semantic pgvector candidates;
- a bounded PostgreSQL exact-term query over the complete selected base/version (no arbitrary row sample);
- deterministic score fusion and document diversity;
- direct PostgreSQL lookup of immediate neighbors, admitted only when direct retrieval leaves context budget;
- unchanged evidence recorder, authorization boundary, and model-visible byte cap.

## GraphRAG decision

Mastra `GraphRAG` 2.6.1 was evaluated from the installed API and documentation. It constructs an O(n²) similarity graph and serialized snapshots duplicate all embeddings. The committed retrieval fixtures show full supporting-passage recall for the best non-graph configuration, with exact-term MRR improving from 0.83 to 1.00 and semantic MRR from 0.44 to 0.67 under a degraded topic-only vector signal. The promotion test compares `hybrid+graphrag` against the best hybrid report and rejects it when it adds no recall/nDCG gain or breaches the explicit 100 ms p95 / 10 KB returned-context bounds. No fixture demonstrates an incremental quality gain that requires graph traversal.

Therefore GraphRAG is not in the production path. Adding graph construction, snapshots, invalidation, and traversal would add operational cost without measured gain over hybrid plus explicit structural neighbors. Revisit only with a versioned fixture where the best hybrid strategy misses required evidence and a bounded GraphRAG experiment improves recall or grounded-deck completeness within latency and byte budgets.
