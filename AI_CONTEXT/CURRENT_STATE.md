# CURRENT_STATE.md
What's actually done vs not done, verified against code as of the last
repomix snapshot (2026-09-09). This file changes often — update after every
meaningful milestone, not just at session end.

## Node ai-service (existing) — mature, feature-complete
✅ Conversation + message CRUD
✅ Chat with LLM (OpenRouter)
✅ Full RAG pipeline (PDF upload → extract → chunk → embed → Qdrant → retrieve → answer)
✅ Chat-title generation consumer
✅ Redis caching (cache-aside)
✅ Match-analysis / commentary controllers

## ai-service-python (migration target) — early stage
✅ FastAPI skeleton + `/health`
✅ `POST /api/chat` — mirrors Node's request/response half of the chat flow
✅ SQLAlchemy async models (Conversation, Message) with UUID PKs
✅ One Alembic migration (conversations + messages tables)
✅ Redis cache invalidation on new message
✅ Publishes `chat.created` to RabbitMQ (isolated `chat-py` exchange)
✅ **Chat-title consumer, with proper retry/DLQ** — `app/consumers/chat_title.py`.
   Manual ack/nack, RabbitMQ `x-death` header used for retry counting (no
   custom counter), TTL-based retry queue, permanent DLQ for exhausted
   retries. Tested with an induced failure end-to-end: 4 attempts → DLQ.
   This is a genuine new implementation — Node's version never had this.
✅ `python-dotenv` added, `.env` actually loads now (was silently not
   loading before, causing an OpenRouter auth failure — fixed)
✅ Env-driven connection strings for RabbitMQ (`RABBIT_URL`) — Postgres
   connection string still hardcoded, not yet cleaned up

❌ No RAG / document handling in Python
❌ No JWT verification inside the Python service itself (trusts header —
   see ARCHITECTURE.md; valid because traffic now goes through api-gateway
   via `/ai-py`, confirmed working — see below)
❌ Not wired into `docker-compose.yml`, no Dockerfile
❌ `GET /conversation/:id/messages` (load message history for a
   conversation) — Node has it, Python doesn't yet. Needed to reopen an
   old conversation from the sidebar.

✅ **Reachable through api-gateway now.** `/ai-py` route added
   (`api-gateway/src/routes/index.ts`), proxies to `localhost:8000` with
   the same `authenticate` middleware as Node's `/ai`. Node's `/ai` route
   is untouched — both exist side by side.
✅ `POST /api/conversation` — creates a Postgres row, returns `_id`
   (matching Mongo's field naming so frontend parsing wasn't touched).
   Frontend (`page.tsx`) fully switched to `/ai-py` for both conversation
   creation and chat.
🔄 `GET /api/list` — in progress (delegated externally), not yet confirmed
   working. Should mirror Node's `{success, conversations: [{_id, title,
   updatedAt, createdAt}]}` shape.
✅ **Full async flow verified end-to-end through the real UI:** chat →
   title generated → published to the shared `conversation.updated` queue
   → api-gateway's existing consumer → Socket.IO → frontend sidebar
   updates in real time. Confirmed by Nikhil in the browser, not just curl.

## Other services — unchanged, not part of current migration scope
- auth-service: JWT + RBAC, appears complete for current needs
- match-service: fully implemented (controllers, routes, CricAPI integration)
- api-gateway: routing, auth middleware, Socket.IO, RabbitMQ consumer — all in place

## Known documentation inconsistencies (found during initial analysis)
- **`context.md` is stale.** Says match-service "not started" — it's actually
  fully built. Doesn't mention RAG/Qdrant at all despite it being a large,
  implemented part of `ai-service`. Treat `context.md` as historical, not
  current — this AI_CONTEXT directory supersedes it.
- **README overstates RabbitMQ reliability.** README describes publisher
  confirms, manual acks, prefetch control, TTL-based retry queue, `x-death`
  retry tracking, idempotency checks, and DLQ handling. Actual code
  (`rabbit.ts`, `chat.consumer.ts`, `document.consumer.ts`) only has a basic
  exchange/queue setup with a plain `channel.nack(msg, false, false)` on
  failure — **no DLQ queue is declared, no retry queue, no requeue logic**.
  This reliability pattern is described in docs but not actually built.
  Relevant if/when the Python side is asked to "port" this — there is
  nothing to port yet; it would be a new build.
