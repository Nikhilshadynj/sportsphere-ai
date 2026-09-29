# ACTIVE_TASK.md
The single most important file for continuity. Keep this accurate and
concise.

## Current task
**Module 1 — Database Performance (Learning Module)**
Measuring the real-world impact of indexing strategies on our PostgreSQL tables
using 150,000 conversations + ~1.5M messages (loadtest-user) as the dataset.

## Completed so far
- **Race Condition Fixes — DONE (2026-09-26).** Fixed 3 race conditions in chat endpoints
  (both Node + Python): atomic title update, cache invalidation reorder.
- **Load Test Data — DONE (2026-09-28).** 150,000 conversations + 1,498,841 messages
  seeded via chunked asyncpg COPY (scripts/seed_load_test_data.py, CHUNK_SIZE=10,000) across 5,000 users.
- **Module 1 Step 1: Single-Column Index Benchmark — DONE (2026-09-29).**
  - Tested on `loadtest-user-99` (30 conversations out of 150,000 rows).
  - With index (`ix_conversations_user_id`): ~0.3ms – 1.9ms.
  - Without index (dropped): ~32ms – 36ms (Seq Scan).
  - Verified ~100x query speedup and confirmed that index selectivity is critical.
  - Recreated `ix_conversations_user_id` back in place.
  - Note: Composite index `(user_id, updated_at DESC)` abhi test NAHI hua (TODO baad me).

## Current / Next Step
- **Step 2 (CURRENT):** k6 se real API load test (Step 2 of Module 1 plan) — baseline throughput & latency on `/api/list` with existing indexes.

## Full Module 1 Plan Reference
- **Step 1:** Baseline query analysis (single-column before/after) — **DONE**
- **Step 2:** k6 API load test (baseline throughput + latency on `/api/list`) — **NEXT**
- **Step 3a:** Alembic migration — add composite index `(user_id, updated_at DESC)` on `conversations` (TODO baad me)
- **Step 3b:** Drop `ix_messages_conversation_id` → measure baseline → recreate composite `(conversation_id, created_at)` on `messages`
- **Step 3c:** Review redundant `ix_conversations_id` and `ix_messages_id` indexes
- **Step 4:** Post-index query analysis (compare vs Step 1)
- **Step 5:** Post-index API load test (compare vs Step 2)
- **Step 6:** Final comparison summary

## Key decisions still in force (see DECISIONS.md for full reasoning)
- Node `ai-service` is being fully replaced by `ai-service-python`, not run in parallel.
- Postgres connection string is still hardcoded in `app/core/database.py` (env cleanup deferred).
- No Dockerfile yet for `ai-service-python` (deferred to after this module).