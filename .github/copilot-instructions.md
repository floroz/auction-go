# Gavel: AI Coding Agent Instructions

## Project Overview

**Gavel** is a distributed auction system demonstrating resilient microservices patterns. It's a **Go + React + Kubernetes** project using event-driven architecture (Transactional Outbox), ConnectRPC for service communication, and a Backend-for-Frontend (BFF) pattern for authentication.

**Key Stack**: Go 1.25+, Next.js 15 (React 19), PostgreSQL, RabbitMQ, Redis, Kubernetes (Kind), Tilt, Protobuf

---

## Architecture & Service Boundaries

### Domain-Driven Design with Decoupled Services

```
BFF (Next.js) ──[ConnectRPC]──> Auth Service ──[Outbox]──> RabbitMQ ──> Stats Service
                            └──> Bid Service  ──[Outbox]──> RabbitMQ ──> Stats Consumer
```

**Critical Pattern**: Services communicate via **Transactional Outbox** (not direct events):

- Business logic saves data + outbox event in a **single transaction** to the service's database
- Background worker polls outbox table and publishes to RabbitMQ
- Stats Service consumes events and updates analytics in its own DB
- This ensures no event loss even if services crash mid-transaction

**Key Files**:

- `internal/domain/` - Domain entities (User, Bid, Auction)
- `internal/service/` - Business logic (no infrastructure coupling)
- `internal/repository/` - Data access layer (raw pgx for transaction control)
- `internal/event/` - Event structures and outbox patterns
- `internal/worker/` - Background workers (outbox polling, event consumption)

---

## Database & Transaction Patterns

### PostgreSQL with Row-Level Locking

**Never use ORMs**. We use raw `pgx` for explicit control:

```go
// Bid Service: Place bid with row lock to prevent race conditions
func (r *BidRepository) PlaceBid(ctx context.Context, bid *domain.Bid) error {
    tx, _ := r.db.Begin(ctx)
    defer tx.Rollback(ctx)

    // SELECT FOR UPDATE locks the row, preventing concurrent bids
    row := tx.QueryRow(ctx,
        "SELECT amount FROM bids WHERE id = $1 FOR UPDATE", bid.ItemID)

    // Validate, insert bid, insert outbox event
    tx.Exec(ctx, "INSERT INTO bids ...")
    tx.Exec(ctx, "INSERT INTO outbox (event_type, payload) ...")

    tx.Commit(ctx)
}
```

**Conventions**:

- Use `SELECT FOR UPDATE` to lock rows during reads in transactions
- Always wrap related operations (business logic + outbox event) in a single transaction
- Use context timeouts: `ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)`

**Key Files**:

- `internal/repository/bid_repository.go` - Bidding logic with outbox
- `internal/repository/auth_repository.go` - User creation with outbox
- Database schema: `migrations/` folder

---

## Event-Driven Architecture (Transactional Outbox)

### Outbox Pattern Implementation

1. **Write Phase** (in service):

   - Transaction saves domain data + inserts row into `outbox` table
   - `outbox` table: `(id, event_type, payload, published_at, created_at)`

2. **Publish Phase** (background worker):

   - Worker polls outbox table for unpublished events
   - Publishes to RabbitMQ topic exchange
   - Marks event as `published_at = NOW()`

3. **Consume Phase** (stats-service):
   - Consumer subscribes to `bid-events` and `user-events` queues
   - Implements idempotency key deduplication to handle retries
   - Updates `user_stats` table

**Key Files**:

- `internal/worker/outbox_worker.go` - Polling logic
- `internal/event/publisher.go` - RabbitMQ publishing
- `stats-service/internal/worker/consumer.go` - Event consumption

**Important**: If a service crashes, outbox events remain unpublished until the worker resumes. This is intentional—we prioritize consistency over latency.

---

## API Communication (ConnectRPC + Protobuf)

### Service-to-Service & BFF Pattern

**Protocol Buffers** define RPC contracts:

- `api/proto/bids/v1/bid_service.proto` - Bid operations
- `api/proto/auth/v1/auth_service.proto` - Auth operations
- `api/proto/userstats/v1/stats_service.proto` - User stats

**Generated Code**:

```bash
make proto-gen  # Regenerates Go code from .proto files
```

**Backend Services** (Go):

- Implement `ConnectRPC` handlers (generated from proto)
- Accept requests **only from BFF** via private network
- Return JSON over HTTP for testing (curl/Postman)

**Frontend** (Next.js):

```bash
pnpm --dir frontend proto:gen  # Generates TypeScript clients
```

Then use in Server Actions:

```typescript
import { createClient } from "@buf/floroz_gavel.connectrpc_es/bids/v1/bid_service_connect";

const client = createClient(BidService);
const response = await client.placeBid({ itemId: "...", amount: 5000 });
```

**Key Files**:

- `api/proto/` - All .proto definitions
- `internal/handler/` - ConnectRPC handler implementations
- `frontend/src/lib/rpc/` - Client wrappers

---

## Authentication & BFF Pattern

### HttpOnly Cookies + Server Actions

**Architecture**:

1. Browser sends credentials via Server Action
2. BFF (Next.js) validates, returns HttpOnly access + refresh tokens
3. Subsequent requests: BFF attaches tokens to downstream ConnectRPC calls
4. Token refresh happens transparently in BFF middleware

**Key Principles**:

- Backend services **never expose public endpoints**—all traffic goes through BFF
- Frontend never touches raw tokens (prevents XSS)
- Server Components fetch data during SSR using authenticated context
- Server Actions handle mutations with automatic CSRF protection

**Key Files**:

- `frontend/src/lib/auth/` - Auth logic (login, token refresh)
- `frontend/src/app/` - Server Components and Actions
- `auth-service/internal/handler/` - Token generation logic
- `docs/PLAN-AUTH-BFF.md` - Detailed auth architecture

---

## Development & Testing

### Local Development (Kubernetes + Tilt)

**Setup** (one-time):

```bash
make cluster              # Create Kind cluster + registry
fnm use && npm install -g pnpm@10.26  # Setup Node/PNPM
```

**Start Development**:

```bash
make dev                  # Start Tilt (all services)
# Press Space to open Tilt UI
# Services auto-rebuild on file changes
```

**Environment Files** (required for frontend):

```bash
cd frontend
cp .env.example .env.local
cp .env.example .env.test
```

**Verify Deployment**:

```bash
./scripts/verify-deployment.sh
make test-integration     # Run full integration suite
```

### Testing Philosophy

**Three Tiers** (no mocks for infrastructure):

1. **Unit Tests** (pure functions, no IO):

   ```bash
   make test-unit  # Fast, no external dependencies
   ```

2. **Integration Tests** (vertical slice, real Postgres/RabbitMQ):

   ```bash
   make test-integration  # Uses Testcontainers-go
   ```

3. **E2E Tests** (full system, Kubernetes):
   - Manual via `make dev` + Tilt UI
   - Or: Run browser tests against `http://app.gavel.local`

**Pattern**: Test handler → service → repository → DB. Avoid mocking the database layer; use Testcontainers instead.

**Key Files**:

- `internal/repository/*_test.go` - Integration tests with real DB
- `internal/service/*_test.go` - Service logic tests
- `internal/handler/*_test.go` - Handler + middleware tests

---

## Project-Specific Conventions

### Code Organization (Hexagonal Architecture)

```
service-name/
├── cmd/server/main.go           # Entry point
├── internal/
│   ├── domain/                  # Business entities (User, Bid, Auction)
│   ├── service/                 # Business logic (pure Go, no frameworks)
│   ├── repository/              # Data access (pgx queries, transactions)
│   ├── handler/                 # ConnectRPC handlers (converts proto → service)
│   ├── event/                   # Event structures and outbox operations
│   ├── worker/                  # Background jobs (outbox polling, consumption)
│   └── config/                  # Configuration & dependency injection
├── migrations/                  # SQL migration files
└── *_test.go                    # Integration tests (build tag: +build integration)
```

### Naming Conventions

- **Handlers**: `PlaceBid(ctx, req) → response, error`
- **Services**: `PlaceBidService(ctx, bid) → error` (pure business logic)
- **Repositories**: `InsertBid(ctx, tx, bid) → error` (takes transaction explicitly)
- **Outbox**: Always publish event in same transaction as business data

### Logging

Use structured logging (`log/slog`):

```go
slog.InfoContext(ctx, "bid placed", "item_id", bid.ItemID, "amount", bid.Amount)
slog.ErrorContext(ctx, "failed to place bid", "error", err)
```

---

## Critical Workflows & Commands

| Goal                  | Command                                                                                                          |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------- |
| Regenerate Protobuf   | `make proto-gen`                                                                                                 |
| Generate TS clients   | `pnpm --dir frontend proto:gen`                                                                                  |
| Run all tests         | `make test`                                                                                                      |
| Run integration tests | `make test-integration`                                                                                          |
| Lint code             | `make lint`                                                                                                      |
| Start dev environment | `make dev`                                                                                                       |
| Tear down k8s         | `make clean`                                                                                                     |
| Test service via curl | `curl -X POST http://api.gavel.local/bids.v1.BidService/PlaceBid -H "Content-Type: application/json" -d '{...}'` |

---

## Key Integration Points

- **RabbitMQ**: Topic exchanges (`bids.*`, `users.*`) for event publishing
- **Redis**: Leaderboards and item metadata caching (optional in beta features)
- **PostgreSQL**: Three isolated databases (auth_db, bid_db, stats_db)
- **Kubernetes Ingress**: Routes `api.gavel.local` → services, `app.gavel.local` → BFF
- **Tilt**: Auto-deploys on file changes, streams logs to UI

---

## When You're Stuck

1. **Architecture questions**: Read `docs/PLAN-AUTH-BFF.md` and architecture diagrams in README
2. **Transaction/concurrency issues**: Check `internal/repository/` for `SELECT FOR UPDATE` patterns
3. **Event delivery**: Verify outbox table polling is active (check worker logs)
4. **Proto changes**: Always run `make proto-gen` + `pnpm --dir frontend proto:gen` after editing .proto files
5. **Tests failing**: Ensure Docker is running (`make test-integration` needs Testcontainers)
6. **Service unreachable**: Check Ingress rules and `/etc/hosts` has `127.0.0.1 api.gavel.local app.gavel.local`
