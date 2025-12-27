package userstats

import (
	"time"

	"github.com/google/uuid"
)

type UserStats struct {
	UserID          uuid.UUID
	TotalBidsPlaced int64
	TotalAmountBid  int64
	LastBidAt       time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ProcessedEvent struct {
	EventID     uuid.UUID
	ProcessedAt time.Time
}

// BidPlacedEvent represents the domain event for a placed bid
// This decouples the domain from the specific Protobuf definition
type BidPlacedEvent struct {
	EventID   uuid.UUID
	UserID    uuid.UUID
	Amount    int64
	Timestamp time.Time
}
