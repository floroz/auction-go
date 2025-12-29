package bids

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestValidateBidAmount(t *testing.T) {
	tests := []struct {
		name           string
		bidAmount      int64
		currentHighest int64
		wantErr        error
	}{
		{
			name:           "Valid bid",
			bidAmount:      150,
			currentHighest: 100,
			wantErr:        nil,
		},
		{
			name:           "Bid too low",
			bidAmount:      90,
			currentHighest: 100,
			wantErr:        ErrBidTooLow,
		},
		{
			name:           "Bid equal to current",
			bidAmount:      100,
			currentHighest: 100,
			wantErr:        ErrBidTooLow,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateBidAmount(tt.bidAmount, tt.currentHighest)
			assert.Equal(t, tt.wantErr, err)
		})
	}
}

func TestValidateAuctionNotEnded(t *testing.T) {
	tests := []struct {
		name    string
		endAt   time.Time
		wantErr error
	}{
		{
			name:    "Auction active",
			endAt:   time.Now().Add(1 * time.Hour),
			wantErr: nil,
		},
		{
			name:    "Auction ended",
			endAt:   time.Now().Add(-1 * time.Hour),
			wantErr: ErrAuctionEnded,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAuctionNotEnded(tt.endAt)
			assert.Equal(t, tt.wantErr, err)
		})
	}
}
