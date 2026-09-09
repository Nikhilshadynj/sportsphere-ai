# PROJECT.md
Stable, rarely-changing context. Read this first in any new session.

## What this project is
Sportsphere AI — an independently built sports (cricket) intelligence platform.
This is a **learning-driven portfolio project**, not a commercial product. The
domain (cricket) is a vehicle; the real goal is hands-on depth in
production-oriented backend engineering.

## Core learning goals (in priority order)
- Python, FastAPI, PostgreSQL, SQLAlchemy
- RAG pipelines and LLM integration
- Distributed systems / microservices communication
- System design: scalability, reliability, caching, queues
- Error handling, observability
- AWS / cloud deployment architecture

## Stack (current, spans two backend languages mid-migration)
- **Frontend:** Next.js (App Router), TypeScript, Socket.IO client
- **Backend (existing):** Node.js, Express, TypeScript
- **Backend (in progress):** Python, FastAPI, SQLAlchemy (async), Alembic
- **Databases:** MongoDB (existing services), PostgreSQL (new — ai-service migration target)
- **Cache:** Redis
- **Queue:** RabbitMQ
- **Vector DB:** Qdrant
- **LLM:** OpenRouter (OpenAI-compatible client)
- **External API:** CricAPI (live match data)
- **Infra:** Docker, Docker Compose, GitHub Actions, AWS EC2/ECR/OIDC/SSM, Nginx

## Repo layout
```
sportsphere-ai/
├── apps/frontend/
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── ai-service/            (Node — existing, feature-complete)
│   ├── ai-service-python/     (Python — new, migration target)
│   └── match-service/
├── docker-compose.yml
└── context.md                 (older doc — see CURRENT_STATE.md for why it's stale)
```

## Current phase
Migrating `ai-service` from Node/Express/MongoDB to Python/FastAPI/PostgreSQL,
learning system design concepts alongside each implementation step.

## [ASSUMPTION] Scope of migration
Only `ai-service` is being migrated to Python/Postgres. `auth-service` and
`match-service` are assumed to remain on Node/MongoDB. Not explicitly
confirmed — verify with Nikhil if this changes.
