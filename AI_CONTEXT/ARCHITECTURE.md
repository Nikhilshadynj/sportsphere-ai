# ARCHITECTURE.md
Current architecture as verified against actual code (repomix snapshot +
manual inspection). Update this when architecture actually changes —
not on every code change (that's CURRENT_STATE.md's job).

## Services

### api-gateway (Node)
- Entry point for all client requests
- JWT auth middleware
- Routes requests to backend services
- Runs Socket.IO server
- Consumes `conversation.updated` from RabbitMQ, emits to frontend via Socket.IO

### auth-service (Node + MongoDB)
- Register, login, JWT issuance
- RBAC (role-based access control) — has admin controller/routes/middleware

### ai-service (Node + MongoDB) — existing, feature-complete
- Conversation + message CRUD
- Chat with LLM (OpenRouter)
- Full RAG pipeline: PDF upload → text extraction → chunking → embedding → Qdrant storage → retrieval → grounded answer
- Match-analysis and commentary controllers (AI-assisted, overlaps with match domain)
- RabbitMQ: publishes `chat.created`, consumes it to generate conversation titles, publishes `conversation.updated`
- Redis: cache-aside for conversations/messages

### ai-service-python (Python + PostgreSQL) — new, migration target
- FastAPI app, `/health` endpoint
- `POST /api/chat`: saves user message, fetches history, calls OpenRouter,
  saves AI response, publishes `chat.created` if conversation is new,
  invalidates Redis cache
- SQLAlchemy async models: `Conversation`, `Message` (UUID primary keys)
- One Alembic migration exists (creates conversations + messages tables)
- **No consumer yet** — see CURRENT_STATE.md

### match-service (Node + MongoDB)
- Live match data via CricAPI
- Match controller, live-match controller, routes fully implemented

## Communication patterns

**Synchronous:** Frontend → api-gateway → (auth-service | ai-service | match-service), REST over HTTP.

**Asynchronous (RabbitMQ):**
```
Chat Created (new conversation, first message)
     |
     v
RabbitMQ Exchange "chat" (type: direct)
     |
     v
chat-title queue (bound via routing key "chat.created")
     |
     v
Consumer generates title via LLM
     |
     v
Update conversation record
     |
     v
Publish conversation.updated (separate queue, no exchange binding — direct sendToQueue)
     |
     v
api-gateway consumer
     |
     v
Socket.IO emit to user's room
     |
     v
Frontend updates without refresh
```

Currently this full loop only exists on the **Node** side (`ai-service`
publishes+has a consumer; `api-gateway` has the downstream consumer). The
Python side only publishes `chat.created` — nothing on the Python side
consumes it yet.

## Data stores
- **MongoDB** — source of truth for auth-service, ai-service (Node), match-service
- **PostgreSQL** — new, source of truth for ai-service-python only (conversations, messages)
- **Redis** — cache-aside layer (conversations, messages), explicit invalidation on write, not update-in-place
- **Qdrant** — vector store for RAG document chunks (Node ai-service only, not yet touched in Python)

## Deployment / infra gaps
- `ai-service-python` is **not** in `docker-compose.yml` and has no Dockerfile in the repo yet — it currently only runs standalone/locally.
- `postgres` service is already added to `docker-compose.yml`.

## Auth trust boundary (confirmed)
`ai-service-python`'s `/api/chat` endpoint trusts an `x-user-id` header
directly with no JWT verification of its own. **Confirmed** (previously an
assumption): `api-gateway`'s `authenticate` middleware verifies the JWT and
sets `req.headers["x-user-id"] = decoded.id` before proxying — this is the
same pattern Node `ai-service` relies on. This trust is only valid when
traffic actually comes through the gateway. **Gateway is not yet wired to
the Python service** (its `/ai` proxy route still targets only Node's
`localhost:5002`), so any local testing that hits `ai-service-python`
directly on its own port bypasses this check entirely — fine for dev
testing, but the gateway route needs to be added/switched before Python
can safely serve real traffic.
