# ACTIVE_TASK.md
The single most important file for continuity. Keep this accurate and
concise.

## Current task
**Infrastructure & Cleanup**
The functional migration of the core Chat and RAG pipelines from Node.js to Python is complete and verified end-to-end. The next phase shifts focus from application logic to deployment and environment configuration.

## Status
- **RAG Retrieval API — DONE & VERIFIED.** The `/query` endpoint successfully fetches context from Qdrant and generates answers.
- **Next Action:** Awaiting decision on the next priority. Potential candidates:
  1. **Dockerization:** Write a `Dockerfile` for `ai-service-python` and integrate it into the project's `docker-compose.yml`.
  2. **Environment Cleanup:** Move hardcoded credentials (like the PostgreSQL connection string) into `.env` and `python-dotenv`.

## Key decisions still in force (see DECISIONS.md for full reasoning)
- Node `ai-service` is being fully replaced, not run in parallel.