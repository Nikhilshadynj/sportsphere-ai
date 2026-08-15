# Sportsphere AI

Sportsphere AI is an independently built sports intelligence platform designed to explore production-oriented backend architecture, real-time communication, asynchronous processing, caching, and Retrieval-Augmented Generation (RAG).

The platform is built using a microservices architecture with separate services for authentication, AI workflows, match data, and API gateway responsibilities.

## Key Features

* Microservices-based backend architecture
* JWT-based authentication
* AI-powered chat and conversation management
* Document upload and RAG-based question answering
* Live cricket match data integration
* Redis-based conversation caching
* RabbitMQ-based asynchronous processing
* Retry and Dead Letter Queue handling
* Real-time frontend updates using Socket.IO
* Docker-based containerization
* AWS deployment workflows using EC2, ECR, GitHub Actions, OIDC, SSM, and Nginx

## Architecture

The application is divided into the following services:

### API Gateway

Acts as the main entry point for client requests.

Responsibilities include:

* Authentication middleware
* Routing requests to backend services
* Socket.IO connection handling
* Consuming backend events and emitting real-time updates to connected users

### Auth Service

Handles:

* User registration
* Login
* JWT authentication
* User identity management

### AI Service

Handles:

* AI conversations
* Conversation persistence
* RabbitMQ-based background processing
* Redis caching
* RAG workflows
* Qdrant vector search
* LLM integration through OpenRouter

### Match Service

Handles:

* Cricket match data
* Live match API integration
* Match-related backend workflows

## RabbitMQ Reliability Flow

RabbitMQ is used for asynchronous chat-title generation and backend event processing.

The implementation includes:

* Publisher confirms
* Manual acknowledgements
* Prefetch control
* Delayed retries using a TTL-based retry queue
* Retry tracking using RabbitMQ `x-death` headers
* Idempotency checks
* Dead Letter Queue handling
* Requeue protection when retry publishing fails

Example flow:

```text
Chat Created
     |
     v
RabbitMQ Exchange
     |
     v
chat-title Queue
     |
     v
Consumer
  /       \
Success   Failure
  |          |
  v          v
Update    Retry Queue
MongoDB      |
  |          v
  |       Delay TTL
  |          |
  |          v
  |      Main Queue
  |
  v
Publish conversation.updated
     |
     v
API Gateway
     |
     v
Socket.IO
     |
     v
Frontend
```

## RAG Pipeline

The document-based question answering flow works as follows:

```text
PDF Upload
    |
    v
Text Extraction
    |
    v
Text Chunking
    |
    v
Ollama Embeddings
    |
    v
Qdrant Vector Storage
    |
    v
User Query
    |
    v
Vector Similarity Search
    |
    v
Relevant Context
    |
    v
OpenRouter LLM
    |
    v
Grounded Response
```

The retrieval process is scoped to the relevant user/document context before generating the final response.

## Redis Caching

Redis is used for conversation-related caching.

The caching strategy includes:

* Cache-aside reads
* TTL-based expiration
* Explicit cache invalidation after conversation or message updates

This reduces unnecessary database access while keeping frequently accessed conversation data available.

## Real-Time Updates

Socket.IO is used to deliver user-specific updates.

For example, when a background RabbitMQ consumer generates a conversation title:

1. AI Service updates the conversation.
2. AI Service publishes a `conversation.updated` event.
3. API Gateway consumes the event.
4. API Gateway emits the update to the relevant user's Socket.IO room.
5. The frontend updates without requiring a page refresh.

## Tech Stack

### Backend

* Node.js
* TypeScript
* Express.js

### Frontend

* Next.js
* React.js

### Databases and Storage

* MongoDB
* Redis
* Qdrant

### Messaging and Real-Time Communication

* RabbitMQ
* Socket.IO

### AI and RAG

* OpenRouter
* Ollama Embeddings
* Qdrant Vector Search

### DevOps and Deployment

* Docker
* GitHub Actions
* AWS EC2
* AWS ECR
* AWS OIDC
* AWS SSM
* Nginx

## Repository Structure

```text
sportsphere-ai/
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── ai-service/
│   └── match-service/
│
├── apps/frontend/
│
├── docker-compose.yml
└── README.md
```

> Repository structure may evolve as the project continues to develop.

## Environment Configuration

Environment-specific values are not committed to the repository.

Each service should use a local `.env` file based on its required configuration.

Example:

```env
PORT=
MONGO_URI=
REDIS_URL=
RABBITMQ_URL=
JWT_SECRET=
OPENROUTER_API_KEY=
```

Actual credentials and secrets should never be committed to Git.

## Current Focus

The project currently focuses on strengthening backend architecture and reliability patterns, including:

* asynchronous processing
* retry and failure handling
* caching
* microservices communication
* RAG
* real-time updates
* containerization
* AWS deployment workflows

## Future Improvements

Planned areas for further development include:

* improved observability and structured logging
* health checks and service monitoring
* additional system design and scaling improvements
* enhanced RAG retrieval quality
* more resilient production deployment patterns
* automated testing across services

## Purpose

Sportsphere AI is an independent engineering project built to deepen hands-on experience with modern backend systems, distributed workflows, AI integration, and production-oriented architecture.
