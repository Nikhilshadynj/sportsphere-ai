# ACTIVE_TASK.md
The single most important file for continuity. Keep this accurate and
concise — this is what a fresh AI session reads first to resume work.
Overwrite this file's content each time the task changes; don't let it grow
into a log (that's what git commits / SESSION history is for).

## Current task
Build the Python consumer for chat-title generation, mirroring Node's
`chat.consumer.ts` — this time with a properly implemented retry/DLQ
pattern (not present in the Node version — see DECISIONS.md).
- Listen on `chat-title` queue (bound to `chat` exchange, routing key `chat.created`)
- On message: call LLM to generate a short title, update the `Conversation`
  row in Postgres, invalidate relevant Redis keys, publish `conversation.updated`
- Use `aio_pika`, matching the async style already used in `app/core/rabbit.py`
- Add: manual ack/nack, prefetch control, TTL-based retry queue, DLQ, idempotency check

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
(empty — implementation not started yet, currently in PHASE 1–4 of the
per-feature workflow: understand → why → system design → plan)

## Immediate next action
Walk through PHASE 1 (UNDERSTAND), PHASE 2 (WHY), PHASE 3 (SYSTEM DESIGN),
PHASE 4 (PLAN) for this consumer before writing any code.

## [ASSUMPTION] Cutover note
Since Node is being fully replaced rather than run in parallel, at some
point Node's `ai-service` chat-title consumer needs to be stopped so it
doesn't compete with the new Python consumer on the same queue (RabbitMQ
would round-robin messages between two consumers on one queue, causing
unpredictable split processing, not duplication — this gets covered
properly in the system-design phase). Assumed the cutover happens once the
Python consumer is verified working, not before. Not explicitly confirmed.
