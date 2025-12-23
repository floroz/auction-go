-- +goose Up
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,      -- e.g., "bid.placed"
    payload JSONB NOT NULL,        -- The actual data
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'published' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- +goose Down
DROP TABLE outbox_events;

