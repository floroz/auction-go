package bids

import (
	"time"

	"github.com/google/uuid"
)

// Bid represents an auction bid
type Bid struct {
	ID        uuid.UUID `db:"id"`
	ItemID    uuid.UUID `db:"item_id"`
	UserID    uuid.UUID `db:"user_id"`
	Amount    int64     `db:"amount"`
	CreatedAt time.Time `db:"created_at"`
}

// EventType defines the type of event
type EventType string

const (
	EventTypeBidPlaced EventType = "bid.placed"
)

func (e EventType) String() string {
	return string(e)
}

func (e EventType) IsValid() bool {
	switch e {
	case EventTypeBidPlaced:
		return true
	default:
		return false
	}
}
