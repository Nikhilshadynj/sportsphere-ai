# ACTIVE_TASK.md
The single most important file for continuity. Keep this accurate and
concise — this is what a fresh AI session reads first to resume work.
Overwrite this file's content each time the task changes; don't let it grow
into a log (that's what git commits / SESSION history is for).

## Current task
Build the Python consumer for chat-title generation, mirroring Node's
`chat.consumer.ts` — this time with a properly implemented retry/DLQ
pattern (not present in the Node version — see DECISIONS.md).
- Listen on `chat-title-py` queue (bound to `chat-py` exchange, routing key
  `chat.created`) — **isolated namespace, not Node's `chat`/`chat-title`**,
  see "Namespace isolation" decision below
- On message: call LLM to generate a short title, update the `Conversation`
  row in Postgres, invalidate relevant Redis keys, publish `conversation.updated`
- Use `aio_pika`, matching the async style already used in `app/core/rabbit.py`
- Add: manual ack/nack, prefetch control, TTL-based retry queue, DLQ, idempotency check

## Step progress
- **Step 1 (rabbit topology) — done.** `rabbit.py` rewritten: env-driven
  connection, reusable channel, retry/DLQ topology declared under an
  isolated `chat-py` namespace (see DECISIONS.md — namespace isolation).
  Verified: queues visible in RabbitMQ Management UI. Committed to git.
- Step 2 (happy-path consumer) — not started, next up.

## Why this task is next
`ai-service-python`'s `/api/chat` already publishes `chat.created` — that
publish currently has no listener, so it's dead weight. Building the
consumer completes the loop Node already has, and is a natural, small,
comparable-to-existing-code first real implementation step in Python.

## Resolved decisions (previously open questions)
- **Node `ai-service` is being fully replaced, not run in parallel.**
  Decided 2026-09-09. No dual-consumer / queue-collision concern — but see
  the cutover note below.
- **Retry/DLQ pattern will be built properly this time**, as a genuine new
  implementation (README described it, Node code never actually had it).

## Progress log for this task
- **Pre-Step-2 debugging session (before writing the consumer):** getting
  `/api/chat` to actually respond locally, since the consumer depends on
  this endpoint's publish already working end-to-end. Found and fixed
  along the way:
  - Root `.gitignore` had no Python entries — added `venv/`, `__pycache__/`, etc.
  - Postgres container was up but had no host port published (compose
    `ports:` wasn't applied because of a stale container from earlier
    manual `docker start`) — fixed by `docker rm` + fresh `docker compose up -d`.
  - **Confirmed:** `ai-service-python` has no `python-dotenv` in
    `requirements.txt` and never calls `load_dotenv()` anywhere — so
    `.env` is never actually loaded. `OPENROUTER_API_KEY` was silently
    falling back to the placeholder string in `chat.py`, causing
    OpenRouter to reject the request with an auth error (surfaced to
    Nikhil as "Missing Authentication header" — confirmed by full-repo
    search this string does not appear anywhere in Node or Python code,
    so it's OpenRouter's own error passing through unhandled).
  - Fix applied: added `python-dotenv`, added `load_dotenv()` to
    `main.py`, confirmed/created real `.env` with `OPENROUTER_API_KEY`.
  - **Status: fix applied, not yet re-verified with a successful curl
    response.** Next session should confirm `/api/chat` returns 200
    before starting Step 2.
- Also clarified for Nikhil (not a code change, just understanding):
  local testing hits `ai-service-python` directly on `localhost:8000`
  (uvicorn's default port — not set anywhere in this repo's code) and
  bypasses `api-gateway` entirely. Confirmed by reading
  `api-gateway/src/routes/index.ts`: the `/ai` proxy route only targets
  `http://localhost:5002` (Node `ai-service`) — gateway has no route to
  the Python service yet. Also confirmed api-gateway's `authenticate`
  middleware is what sets `x-user-id` from the verified JWT before
  proxying (resolves the earlier [ASSUMPTION] in ARCHITECTURE.md about
  the trust boundary — it's real, gateway does validate before forwarding,
  Python service correctly trusts it *only when traffic comes through the
  gateway*, which it currently doesn't in local testing).

## Immediate next action
Re-run the curl test to confirm `/api/chat` now returns 200 after the
dotenv fix. Once confirmed, proceed to PHASE 1–4 (understand → why →
system design → plan — already done, documented above) → PHASE 5 Step 2:
write the happy-path consumer.

## Cutover note (revised)
Earlier assumption was that Node's queues would need to be deleted/stopped
to avoid collision. **Revised, per Nikhil's direction:** Node is Nikhil's
main stack and may be revived later, so Node's exchange/queues are left
completely untouched. Python uses its own isolated `chat-py` namespace
(see DECISIONS.md). "Cutover" now just means: frontend/gateway traffic
points at the Python `/api/chat` endpoint instead of Node's, so Node's
publish side is simply never triggered — no deletion, no forced shutdown,
Node stays revivable by just restarting the service and re-pointing traffic.
