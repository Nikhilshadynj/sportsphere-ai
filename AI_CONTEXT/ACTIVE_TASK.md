# ACTIVE_TASK.md
The single most important file for continuity. Keep this accurate and
concise — this is what a fresh AI session reads first to resume work.
Overwrite this file's content each time the task changes; don't let it grow
into a log (that's what git commits / SESSION history is for).

## Current task
Frontend integration — point the frontend's chat API call at the new
`/ai-py` gateway route (added, see below) instead of Node's `/ai`, so the
whole flow (frontend → gateway → Python → RabbitMQ consumer → Socket.IO)
can be verified end-to-end through the real UI, not just curl.

## Status
- **Gateway route `/ai-py` — added, NOT yet curl-verified.**
  `api-gateway/src/routes/index.ts` now has a second route, `/ai-py`,
  proxying to `ai-service-python` (`localhost:8000`), with the same
  `authenticate` middleware as `/ai`. Node's `/ai` route is untouched
  (isolation pattern, same as the RabbitMQ namespace decision).
  **Next action: curl-test `/ai-py` through the gateway with a real JWT**
  (login first, then hit `/api/ai-py/api/chat` — note the double `/api`:
  gateway's own `/api` prefix + the `/ai-py` route + Python's own
  `/api/chat` route — with `Authorization: Bearer`) before touching the
  frontend — confirms `x-user-id` is reaching Python correctly via the
  gateway, not just via a manually-set header like all prior local testing.
- **Frontend change — not started.** Once the curl test above passes,
  change the frontend's chat API call from `/ai` to `/ai-py`. This is
  being delegated externally (Gemini) — see DECISIONS.md if a note gets
  added there about that split. Whoever does it: only change the
  endpoint/base URL for the chat call, reuse the existing JWT-header
  pattern already used elsewhere in the frontend, don't touch gateway or
  backend code.
- **Verification owner: Nikhil, manually, in the browser** — not whoever
  writes the frontend change. "Looks done" in a diff is not "verified."
  Verified means: send a message in the actual UI, see the AI reply, see
  the conversation title update in real time (Socket.IO, via the shared
  `conversation.updated` queue).

## Recently completed (condensed — see CURRENT_STATE.md for full detail)
- Python chat-title consumer built with proper manual ack/nack + TTL
  retry queue + DLQ, using RabbitMQ's own `x-death` header for retry
  counting. Tested with an induced failure: 4 attempts → landed in DLQ
  correctly. Fully committed to git.
- Isolated RabbitMQ namespace (`chat-py` exchange/queues) so Node's
  original `chat`/`chat-title` setup stays untouched and revivable.
- Fixed along the way: `.gitignore` missing Python entries, Postgres
  container port not published, `python-dotenv` missing (silently broke
  `.env` loading, caused an OpenRouter auth failure).

## Key decisions still in force (see DECISIONS.md for full reasoning)
- Node `ai-service` is being fully replaced, not run in parallel — but
  nothing of Node's is deleted; everything Python-side uses an isolated
  namespace/route so Node stays revivable.
- `conversation.updated` queue is the one exception to isolation — it's a
  real cross-service contract with `api-gateway`, Python publishes to the
  exact same existing queue name, not a namespaced one.
