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
   see ARCHITECTURE.md; this is fine *only* when traffic comes through
   api-gateway, which it currently doesn't — see below)
❌ Not wired into `docker-compose.yml`, no Dockerfile
❌ **Not reachable through api-gateway.** All testing so far has been
   direct curl to `localhost:8000`, bypassing the gateway (and therefore
   bypassing JWT auth) entirely. Gateway's `/ai` route still only proxies
   to Node's `ai-service` on `:5002`. This is the next thing being worked
   on — frontend/gateway integration.

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
