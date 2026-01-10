package items

import (
	"time"

	"github.com/google/uuid"
)

// ItemStatus represents the lifecycle state of an auction item
type ItemStatus string

const (
	ItemStatusActive    ItemStatus = "active"
	ItemStatusEnded     ItemStatus = "ended"
	ItemStatusCancelled ItemStatus = "cancelled"
)

// IsValid checks if the status is valid
func (s ItemStatus) IsValid() bool {
	switch s {
	case ItemStatusActive, ItemStatusEnded, ItemStatusCancelled:
		return true
	default:
		return false
	}
}

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
	Images            []string
	Category          string
	SellerID          uuid.UUID
	Status            ItemStatus
}

// IsActive returns true if the item is in active status and has not ended
func (i *Item) IsActive() bool {
	return i.Status == ItemStatusActive && time.Now().Before(i.EndAt)
}

// CanBeCancelled returns true if the item can be cancelled (active and no bids)
func (i *Item) CanBeCancelled(hasBids bool) bool {
	return i.Status == ItemStatusActive && !hasBids
}

// IsOwnedBy returns true if the item is owned by the given user
func (i *Item) IsOwnedBy(userID uuid.UUID) bool {
	return i.SellerID == userID
}
