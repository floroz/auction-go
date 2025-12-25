package items

import (
	"time"

	"github.com/google/uuid"
)

// Item represents an auction item
type Item struct {
	ID                uuid.UUID
	Title             string
	Description       string
	StartPrice        int64 // in cents/micros
	CurrentHighestBid int64
	EndAt             time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
