# CURRENT_STATE.md
What's actually done vs not done, verified against code as of the last
repomix snapshot (2026-09-09) and recent live sessions. This file changes often — update after every
meaningful milestone, not just at session end.

## Node ai-service (existing) — mature, feature-complete
✅ Conversation + message CRUD
✅ Chat with LLM (OpenRouter)
✅ Full RAG pipeline (PDF upload → extract → chunk → embed → Qdrant → retrieve → answer)
✅ Chat-title generation consumer
✅ Redis caching (cache-aside)
✅ Match-analysis / commentary controllers
✅ Race condition fixes in chat endpoint (2026-09-26): atomic `findOneAndUpdate` for title check, cache invalidation reordered

## ai-service-python (migration target) — progressing
✅ FastAPI skeleton + `/health`
✅ **Frontend Integration & API Gateway:** Reachable through api-gateway via `/ai-py` route. Frontend migrated to use this route.
✅ **Core Chat API Complete:** `POST /api/chat`, `POST /api/conversation`, `GET /api/list`, `GET /api/conversation/{id}/messages`.
✅ **RAG Pipeline Complete:** 
   - `POST /api/documents/upload` implemented (saves to disk, Postgres, RabbitMQ).
   - Background Consumer (`document.processing.py`) implemented and verified.
   - `POST /api/documents/query` implemented. Successfully embeds questions, performs multi-tenant similarity search in Qdrant (using latest `query_points` API), and generates LLM answers via OpenRouter.
✅ **Race condition fixes in chat endpoint (2026-09-26):** atomic `UPDATE ... WHERE title='New Chat'` for title check, cache invalidation reordered before RabbitMQ publish.
✅ **Module 1 (Database Performance):** Single-column index benchmark verified (~100x speedup: ~0.3ms with index vs ~32–36ms Seq Scan on 150,000 conversations dataset across 5,000 users). Composite index test pending (TODO).

❌ No JWT verification inside the Python service itself (trusts api-gateway).
❌ Postgres connection string is still hardcoded.
❌ Not wired into `docker-compose.yml`, no Dockerfile.