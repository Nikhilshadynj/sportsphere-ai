SPORTSPHERE-AI PROJECT CONTEXT
1. Project Overview

Sportsphere-AI is an AI-powered sports assistant application.

Current development focus:

AI chat system
Conversation management
Realtime updates
Event-driven backend architecture

Current phase:
Phase 1: AI Chat Platform

Chat system is almost complete.

2. Tech Stack
Frontend
Next.js (App Router)
TypeScript
Socket.io Client
Backend
Node.js
Express.js
TypeScript
Architecture

Microservices based architecture:

Services:

API Gateway
Auth Service
AI Service
Match Service

Infrastructure:

Docker
MongoDB
Redis
RabbitMQ

Authentication:

JWT based authentication

AI:

LLM integration (OpenRouter/OpenAI compatible)
3. Project Architecture

High level flow:

Frontend (Next.js)
        |
        |
API Gateway :4000
        |
 --------------------------------
 |              |               |
Auth         AI Service      Match Service
:5001          :5002            :5003
 |
MongoDB

API Gateway responsibilities:

Route requests to services
Authentication middleware
Socket.io server
RabbitMQ event consumer
4. Authentication Flow

Implemented:

Register API
Login API
JWT generation
Protected routes

Flow:

User Login
    |
Auth Service
    |
Generate JWT
    |
Frontend stores token
    |
API requests send:

Authorization: Bearer <token>

    |
API Gateway middleware validates token
5. AI Chat System

Implemented:

Features:

✅ Create conversation
✅ Send messages
✅ Save messages
✅ Load previous conversations
✅ Load previous messages
✅ AI response generation

Flow:

User Message
      |
Frontend
      |
API Gateway
      |
AI Service
      |
LLM
      |
Save response
      |
MongoDB
6. Redis Implementation

Redis is already implemented.

Purpose:

Cache conversations
Cache messages
Reduce MongoDB reads

Flow:

Request conversation/messages

        |
        v

Check Redis

        |
 ----------------
 |              |
Found        Not Found
 |              |
Return      MongoDB
              |
              v
        Store in Redis
              |
              v
          Return Data

MongoDB remains the source of truth.
Redis is used as cache layer.

7. RabbitMQ Implementation

RabbitMQ is used for asynchronous event-driven communication.

Currently two events exist:

Event 1: chat-title

Purpose:
Generate conversation title asynchronously.

Flow:

First user message
        |
Conversation created
        |
Publish chat-title event
        |
RabbitMQ Exchange
(chat)
        |
Consumer
        |
Generate title using LLM
        |
Update conversation
Event 2: conversation-update

Purpose:
Send realtime title update to frontend.

Flow:

Title generated
        |
Conversation updated
        |
sendToQueue()
        |
RabbitMQ Queue
        |
API Gateway Consumer
        |
Socket.io emit
        |
Frontend Update
8. Socket.io Implementation

Socket.io is implemented inside API Gateway.

Purpose:

Real-time frontend updates

Current use case:

Conversation title update.

Flow:

RabbitMQ Consumer
        |
API Gateway
        |
Socket.io emit
        |
Frontend listener
        |
Update sidebar title

No page refresh required.

9. Current Completed Features

✅ Microservices setup
✅ API Gateway routing
✅ JWT authentication
✅ AI Chat
✅ Conversation management
✅ Message persistence
✅ Redis caching
✅ RabbitMQ async title generation
✅ Socket.io realtime updates

10. Not Started Yet

❌ RAG implementation

❌ Match service features

Match service currently only exists as service structure.

Future scope:

Live matches
Match analysis
Sports data integration
11. Current Development Status

Current state:

"The AI chat module is almost complete."

Continue development from here.

Do not redesign architecture.

Next possible tasks:

Improve chat UX
Realtime message streaming
Typing indicator
Redis optimization
RAG implementation
Sports features
12. Important Instruction For AI Assistant

When continuing this project:

Understand existing architecture first.
Prefer production-level solutions.
Do not suggest replacing the architecture.
Continue from current implementation.
Ask for existing code before major changes.

# current architecture 

├── apps
│   └── frontend
│       ├── AGENTS.md
│       ├── app
│       ├── CLAUDE.md
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── next-env.d.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── public
│       ├── README.md
│       └── tsconfig.json
├── context.md
├── docker-compose.yml
├── package.json
├── package-lock.json
├── packages
│   └── typescript-config
│       ├── base.json
│       └── package.json
├── services
│   ├── ai-service
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── src
│   │   └── tsconfig.json
│   ├── api-gateway
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── src
│   │   └── tsconfig.json
│   ├── auth-service
│   │   ├── data
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── src
│   │   └── tsconfig.json
│   ├── match-service
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── src
│   │   └── tsconfig.json
│   ├── package.json
│   └── package-lock.json
└── turbo.json
