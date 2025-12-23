# Milestone 2: The Transactional Outbox Pattern

Now that we have the infrastructure running, we need to solve the most common distributed systems problem: **Consistency**.

## The Problem: "Dual Writes"

In a real-time auction, when a user places a bid, two things must happen:
1. **Persistence:** The bid is saved to PostgreSQL (so it's not lost).
2. **Notification:** An event is published to RabbitMQ (so the UI updates in real-time).

If you do this:
```go
db.Save(bid) // Succeeded
// --- Power Failure / Network Crash ---
mq.Publish(event) // Never happened
```
Your database says the user bid, but no one else sees it. The system is inconsistent.

Reversing the order doesn't help (what if MQ publishes but DB fails?).

## The Solution: Transactional Outbox Pattern

We will treat the "Message" as a database row. We save the **Bid** and the **Event** in the *same* database transaction. This guarantees that if the Bid is saved, the Event is also saved.

A separate background process (the **Relay**) will pick up saved events and push them to RabbitMQ.

---

## 2. Step-by-Step Implementation Plan

### Step 2.1: Schema Evolution (The Outbox Table)
Create a new migration `migrations/00002_create_outbox.sql`.
We need a table to store events waiting to be sent.

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,      -- e.g., "bid.placed"
    payload JSONB NOT NULL,        -- The actual data
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'published' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);
```

### Step 2.2: Define the Contracts (Protobuf)
We need a strict contract for our messages.
1. Create `api/proto/events.proto`.
2. Define a `BidPlaced` message (bid_id, user_id, amount, timestamp).
3. Use `protoc` to generate Go code into `internal/pb`.
   *Tip: You'll need to install `protoc` and the Go plugins.*

### Step 2.3: Transactional Implementation
Implement the `PlaceBid` function in a Service layer. It must:
1. Start a Postgres Transaction (`pgx.Tx`).
2. Insert the Bid row.
3. **Inside the same transaction**, insert the `outbox_event` row (marshalling the Protobuf message to JSON/Bytes).
4. Commit.

If step 3 fails, the Bid is rolled back. Consistency achieved.

### Step 2.4: The Outbox Relay (Worker)
Create a background goroutine (or separate `cmd/worker/main.go`) that:
1. Polls `outbox_events` for 'pending' events.
    *   *Challenge:* How do you prevent multiple workers from grabbing the same event? (Hint: `SELECT FOR UPDATE SKIP LOCKED` is the Postgres magic word here).
2. Decodes the payload.
3. Publishes to RabbitMQ.
4. Updates the row status to 'published'.

---

## 3. Acceptance Criteria

1. **Failure Test:** You can disconnect RabbitMQ, place a bid, and the bid **should** still be in the DB (and the event in the outbox table).
2. **Recovery:** When RabbitMQ comes back online, the worker should automatically send the pending messages.
3. **Code Organization:** No more logic in `main.go`. Logic lives in `internal/`.

## 4. TA Questions (Answer these as you implement)

1. **Idempotency:** If the Relay crashes *after* publishing to RabbitMQ but *before* updating the DB to 'published', the event stays 'pending'. When it restarts, it will send the message *again*. How will your consumers handle receiving the same Bid twice?
2. **Ordering:** Does your Outbox Relay guarantee that bids are published in the exact order they happened? Why or why not?

---
**Ready? Acknowledge this plan and start by setting up the folder structure and the migration.**

