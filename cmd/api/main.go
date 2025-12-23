package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Check Postgres
	db, err := pgx.Connect(ctx, "postgres://user:password@localhost:5432/auction_db")
	if err != nil {
		log.Fatalf("Postgres failed: %v", err)
	}
	defer db.Close(ctx)
	log.Println("✅ Postgres Connected")

	// 2. Check RabbitMQ
	mq, err := amqp091.Dial("amqp://guest:guest@localhost:5672/")
	if err != nil {
		log.Fatalf("RabbitMQ failed: %v", err)
	}
	defer mq.Close()
	log.Println("✅ RabbitMQ Connected")

	// 3. Check Redis
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Redis failed: %v", err)
	}
	log.Println("✅ Redis Connected")

	log.Println("Milestone 1: Infrastructure is solid.")
}
