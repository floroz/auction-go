package database

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// TransactionManager defines the interface for managing database transactions.
// It abstracts the underlying database driver (pgx) to allow for easier testing and decoupling.
type TransactionManager interface {
	// BeginTx starts a new transaction.
	BeginTx(ctx context.Context) (pgx.Tx, error)
}
