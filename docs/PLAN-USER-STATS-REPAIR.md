# Plan: Self-Healing User Stats (On-Read Repair)

## Problem
Currently, `user-stats-service` relies entirely on asynchronous events from RabbitMQ to create user records. If an event is lost or the service is down during user creation, the user will permanently have no stats record.

## Solution: On-Read Repair (Lazy Initialization)
Implement a "check-and-fix" logic when stats are requested but not found. This ensures that valid users always have stats, even if the event stream failed.

## Implementation Steps

### 1. Update `user-stats-service` Service Logic
- In `internal/domain/userstats/service.go`:
    - Modify `GetUserStats(ctx, userID)` method.
    - **Current Flow**:
        ```go
        return s.repo.GetUserStats(ctx, userID) // Returns error/nil if missing
        ```
    - **New Flow**:
        1. Attempt to get stats from repo.
        2. If found, return stats.
        3. If **not found** (e.g., `ErrUserStatsNotFound`):
            a. Call `auth-service` via gRPC (`GetProfile` or similar existing RPC) to verify user existence.
            b. If user does **not** exist in Auth: Return `ErrUserNotFound` (true 404).
            c. If user **does** exist:
                i.  **Self-Heal**: Call `s.repo.CreateUserStats(ctx, tx, userID, user.CreatedAt)`.
                ii. Log this event ("Self-healing triggered for user X").
                iii. Return the newly created (empty) stats object.

### 2. Infrastructure Requirements
- **Auth Client**: Ensure `user-stats-service` has a gRPC client configured to talk to `auth-service`.
    - Use `pkg/proto/auth/v1/authv1connect`.
    - Inject this client into `UserStatsService`.

### 3. Considerations
- **Concurrency**: Multiple simultaneous requests for the same missing user could trigger parallel repairs.
    - *Mitigation*: The `CreateUserStats` SQL query already uses `ON CONFLICT DO NOTHING`, so race conditions are safe at the DB level.
- **Latency**: This adds a synchronous gRPC call to the read path, but *only* for the first request of a "broken" user. Subsequent requests hit the DB as normal.

### 4. Verification
- **Test Case**:
    1. Manually create a user in `auth-service` (bypassing the outbox to simulate failure).
    2. Call `GET /stats` in `user-stats-service`.
    3. Verify it does *not* return 404, but instead returns initialized stats.
    4. Verify a row was created in `user_stats` table.

