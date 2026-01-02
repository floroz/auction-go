-- +goose Up
CREATE TYPE outbox_status AS ENUM ('pending', 'processing', 'published', 'failed');

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,      -- e.g., "bid.placed"
    payload BYTEA NOT NULL,        -- Protobuf serialized bytes
    status outbox_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- +goose Down
DROP TABLE IF EXISTS outbox_events;
DROP TYPE IF EXISTS outbox_status;
