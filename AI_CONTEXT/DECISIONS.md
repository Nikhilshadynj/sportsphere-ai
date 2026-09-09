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
Same exchange *type* (direct) and routing-key convention (`chat.created`)
as Node, for comparability while learning — but see "Namespace isolation"
below, this no longer means literally sharing Node's exchange/queue names.

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

**Namespace isolation: Python's RabbitMQ topology does not reuse Node's
exchange/queue names.** Node's chat-title queue already existed (declared
without DLX arguments) from earlier Node testing; redeclaring it with new
arguments (for DLQ support) would throw a RabbitMQ `PRECONDITION_FAILED`
error, and — more importantly — Nikhil wants Node kept fully intact and
revivable since it's his primary stack, Python is the learning track.
Decision: Python uses its own exchange (`chat-py`) and queues
(`chat-title-py`, `chat-title-py-retry`, `chat-title-py-dlq`), completely
isolated from Node's `chat`/`chat-title`. Node's topology is never touched,
never deleted. "Cutover" to Python means routing traffic to Python's
endpoint, not modifying or removing Node's infrastructure.

**Connection strings are now env-driven** (`RABBIT_URL`, and `DATABASE_URL`
to be moved to env in an upcoming step) — resolves the earlier
hardcoded-connection-string flag.

## [ASSUMPTION] Decisions not yet explicitly confirmed

**Scope: only ai-service migrates, auth/match stay on Node+Mongo**
Inferred from the fact that only `ai-service-python` exists and
docker-compose still runs Mongo for the other services. Not stated
outright — confirm if this is intentional or just "not gotten to yet".
