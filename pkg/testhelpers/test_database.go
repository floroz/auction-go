package testhelpers

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

type TestDatabase struct {
	Container *postgres.PostgresContainer
	Pool      *pgxpool.Pool
	ConnStr   string
}

func NewTestDatabase(t *testing.T, migrationsPath string) *TestDatabase {
	t.Helper()
	ctx := context.Background()

	// Start Postgres container
	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("user"),
		postgres.WithPassword("password"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %s", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %s", err)
	}

	// Connect to database with pgxpool
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		t.Fatalf("failed to connect to database: %s", err)
	}

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("failed to ping database: %s", err)
	}

	// Run migrations using standard sql driver
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		t.Fatalf("failed to open sql db for migrations: %s", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		t.Fatalf("failed to set goose dialect: %s", err)
	}

	absPath, err := filepath.Abs(migrationsPath)
	if err != nil {
		t.Fatalf("failed to get absolute path for migrations: %s", err)
	}

	if err := goose.Up(db, absPath); err != nil {
		t.Fatalf("failed to run migrations: %s", err)
	}

	return &TestDatabase{
		Container: pgContainer,
		Pool:      pool,
		ConnStr:   connStr,
	}
}

func (td *TestDatabase) Close() {
	ctx := context.Background()
	td.Pool.Close()
	if err := td.Container.Terminate(ctx); err != nil {
		// Just log error, don't fail test cleanup explicitly if container fails to stop
		// fmt.Printf("failed to terminate container: %v\n", err)
	}
}
