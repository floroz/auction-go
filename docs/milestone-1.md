Hello! It’s great to meet you. As your TA, I’m excited to dive into this. Transitioning from Frontend to Backend/Systems is a journey of shifting your mindset from **UI state** to **Data integrity and Distributed Failure Modes**.

In a real-time auction, the "happy path" is easy. The "Senior" part of your learning comes from handling the 1% of cases where the network dies, the disk is full, or two users bid at the exact same microsecond.

Here is the plan for **Milestone 1: The Foundation**.

---

## 1. Project Folder Structure

We will follow a simplified version of the [Standard Go Project Layout](https://github.com/golang-standards/project-layout). We keep logic in `internal` to prevent external leakage and use `cmd` for entry points.

```text
.
├── cmd/
│   └── api/
│       └── main.go          # Entry point
├── internal/
│   ├── auction/             # Domain logic (Bidding, Items)
│   ├── infra/               # Infrastructure (DB, MQ, Redis clients)
│   └── pb/                  # Generated Protobuf files
├── migrations/              # Goose SQL files
├── scripts/                 # Helpful dev scripts
├── docker-compose.yml
├── Makefile                 # For common commands (migrate, test)
└── go.mod

```

---

## 2. Infrastructure Setup (`docker-compose.yml`)

We need a stable environment. I’ve included health checks to ensure your Go app doesn't try to connect before the services are ready.

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: auction_db
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d auction_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"   # AMQP protocol
      - "15672:15672" # Management UI
    healthcheck:
      test: ["CMD-SHELL", "rabbitmq-diagnostics -q check_running"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

```

---

## 3. Database Schema (Goose Migrations)

Create a directory named `migrations`. We will start with a clean relational structure. Note the use of `BIGINT` for prices (storing cents/micros) to avoid floating-point errors.

**File:** `migrations/00001_initial_schema.sql`

```sql
-- +goose Up
CREATE TABLE items (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_price BIGINT NOT NULL,
    current_highest_bid BIGINT DEFAULT 0,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bids (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES items(id),
    user_id UUID NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- +goose Down
DROP TABLE bids;
DROP TABLE items;

```

---

## 4. The "Foundation" Go Server

This `main.go` verifies that your environment is alive. We use `pgx` for Postgres as it's the gold standard for Go.

```go
package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Check Postgres
	db, err := pgx.Connect(ctx, "postgres://user:password@localhost:5432/auction_db")
	if err != nil {
		log.Fatalf("Postgres failed: %v", err)
	}
	defer db.Close(ctx)
	log.Println("✅ Postgres Connected")

	// 2. Check RabbitMQ
	mq, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("RabbitMQ failed: %v", err)
	}
	defer mq.Close()
	log.Println("✅ RabbitMQ Connected")

	// 3. Check Redis
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Redis failed: %v", err)
	}
	log.Println("✅ Redis Connected")

	log.Println("Milestone 1: Infrastructure is solid.")
}

```

---

## TA Assessment & Failure Inquiry

Before you write the code, consider this scenario for **Milestone 2 (The Outbox Pattern)**:

> **Scenario:** You have a function `PlaceBid()`. Inside, you successfully save the bid to the **Postgres** table. Your next line of code is `rabbitMQ.Publish(...)` to tell the UI a new bid arrived.
> **The Failure:** The power cuts out *exactly* after the DB commit but *before* the RabbitMQ message is sent.
> **Question:** In this state, is the system consistent? What does the bidder see versus what the other participants see in their UI?

### Your Next Steps:

1. Initialize your Go module: `go mod init github.com/yourname/auction-system`.
2. Install dependencies: `go get github.com/jackc/pgx/v5 github.com/rabbitmq/amqp091-go github.com/redis/go-redis/v9`.
3. Run `docker-compose up -d`.
4. Apply the migration: `goose -dir migrations postgres "user=user password=password dbname=auction_db sslmode=disable" up`.
5. Run the Go server and confirm all three "✅" logs appear.
