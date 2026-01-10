package items

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestItemStatus_IsValid(t *testing.T) {
	tests := []struct {
		name   string
		status ItemStatus
		want   bool
	}{
		{
			name:   "active status is valid",
			status: ItemStatusActive,
			want:   true,
		},
		{
			name:   "ended status is valid",
			status: ItemStatusEnded,
			want:   true,
		},
		{
			name:   "cancelled status is valid",
			status: ItemStatusCancelled,
			want:   true,
		},
		{
			name:   "invalid status",
			status: ItemStatus("invalid"),
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.status.IsValid()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestItem_IsActive(t *testing.T) {
	tests := []struct {
		name   string
		item   *Item
		want   bool
	}{
		{
			name: "active item with future end time",
			item: &Item{
				Status: ItemStatusActive,
				EndAt:  time.Now().Add(1 * time.Hour),
			},
			want: true,
		},
		{
			name: "active item with past end time",
			item: &Item{
				Status: ItemStatusActive,
				EndAt:  time.Now().Add(-1 * time.Hour),
			},
			want: false,
		},
		{
			name: "ended item with future end time",
			item: &Item{
				Status: ItemStatusEnded,
				EndAt:  time.Now().Add(1 * time.Hour),
			},
			want: false,
		},
		{
			name: "cancelled item with future end time",
			item: &Item{
				Status: ItemStatusCancelled,
				EndAt:  time.Now().Add(1 * time.Hour),
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.item.IsActive()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestItem_CanBeCancelled(t *testing.T) {
	tests := []struct {
		name    string
		item    *Item
		hasBids bool
		want    bool
	}{
		{
			name: "active item with no bids can be cancelled",
			item: &Item{
				Status: ItemStatusActive,
			},
			hasBids: false,
			want:    true,
		},
		{
			name: "active item with bids cannot be cancelled",
			item: &Item{
				Status: ItemStatusActive,
			},
			hasBids: true,
			want:    false,
		},
		{
			name: "ended item cannot be cancelled",
			item: &Item{
				Status: ItemStatusEnded,
			},
			hasBids: false,
			want:    false,
		},
		{
			name: "cancelled item cannot be cancelled again",
			item: &Item{
				Status: ItemStatusCancelled,
			},
			hasBids: false,
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.item.CanBeCancelled(tt.hasBids)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestItem_IsOwnedBy(t *testing.T) {
	sellerID := uuid.New()
	otherUserID := uuid.New()

	tests := []struct {
		name   string
		item   *Item
		userID uuid.UUID
		want   bool
	}{
		{
			name: "item is owned by seller",
			item: &Item{
				SellerID: sellerID,
			},
			userID: sellerID,
			want:   true,
		},
		{
			name: "item is not owned by other user",
			item: &Item{
				SellerID: sellerID,
			},
			userID: otherUserID,
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.item.IsOwnedBy(tt.userID)
			assert.Equal(t, tt.want, got)
		})
	}
}
