# DECISIONS.md
Why things are the way they are. Add an entry whenever a real architectural
or design choice is made — not implementation trivia. If actual code
disagrees with a decision noted here, code wins (see CODING RULES) and this
file should be corrected.

## Decisions already reflected in existing code

**UUID primary keys (Postgres) instead of MongoDB ObjectIds**
Trade-off: UUIDs are larger (16 bytes vs 12) and not naturally
sortable-by-creation-time like ObjectId is, but they're the idiomatic choice
for relational schemas and avoid coupling ID format to Mongo specifically.

**Async SQLAlchemy + asyncpg over sync SQLAlchemy**
Keeps the whole request path non-blocking, consistent with FastAPI's async
model and with the existing Node service's non-blocking I/O style.

**RabbitMQ direct exchange pattern retained (not switched to topic/fanout)**
Python side reuses the same `chat` exchange / `chat.created` routing key
convention as Node — keeps the two implementations comparable while
learning, and avoids redesigning messaging topology mid-migration.

**Redis cache-aside with explicit invalidation (not write-through)**
Existing pattern in Node service; Python side's `invalidate_cache` mirrors
it. Simpler to reason about for a small side-project scale; write-through
would reduce cache-miss-after-write windows but adds complexity not
currently needed.

## Confirmed decisions (2026-09-09)

**Node `ai-service` will be fully replaced by `ai-service-python`, not run
in parallel.** Reasoning given: no real benefit to running both at once for
a solo project — adds coordination overhead without a corresponding
upside. Implication: no need to design around competing consumers on
shared queues long-term, but a clean one-time cutover is still needed when
Python's consumer goes live (see ACTIVE_TASK.md).

**Retry/DLQ reliability pattern will be built properly this time**, in the
Python consumer, as a genuine new implementation — not a port, since it
never actually existed in the Node version despite README claiming it did.
This is being treated as real learning scope (manual ack/nack, prefetch,
TTL retry queue, `x-death` tracking, idempotency, DLQ), not an afterthought.

## [ASSUMPTION] Decisions not yet explicitly confirmed

**Scope: only ai-service migrates, auth/match stay on Node+Mongo**
Inferred from the fact that only `ai-service-python` exists and
docker-compose still runs Mongo for the other services. Not stated
outright — confirm if this is intentional or just "not gotten to yet".

**Hardcoded connection strings in `ai-service-python`**
(`DATABASE_URL` in `database.py`, AMQP URL in `rabbit.py`) — likely just
early-stage/not-cleaned-up-yet rather than a deliberate decision, since
every other service in the repo uses `.env`. Flagging here so it doesn't
get treated as an intentional pattern to copy.
