package events

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/protobuf/proto"

	pb "github.com/floroz/gavel/pkg/proto"
	"github.com/floroz/gavel/services/user-stats-service/internal/domain/userstats"
)

// UserConsumer consumes user events and updates user statistics
type UserConsumer struct {
	conn    *amqp.Connection
	service *userstats.Service
	logger  *slog.Logger
}

// NewUserConsumer creates a new user consumer
func NewUserConsumer(conn *amqp.Connection, service *userstats.Service, logger *slog.Logger) *UserConsumer {
	return &UserConsumer{
		conn:    conn,
		service: service,
		logger:  logger,
	}
}

// Run starts the consumer loop
func (c *UserConsumer) Run(ctx context.Context) error {
	ch, err := c.conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open channel: %w", err)
	}
	defer ch.Close()

	// Setup Exchange & Queue
	if setupErr := c.setupRabbitMQ(ch); setupErr != nil {
		return fmt.Errorf("failed to setup rabbitmq: %w", setupErr)
	}

	msgs, err := ch.Consume(
		"user_stats_users", // queue
		"",                 // consumer tag
		false,              // auto-ack
		false,              // exclusive
		false,              // no-local
		false,              // no-wait
		nil,                // args
	)
	if err != nil {
		return fmt.Errorf("failed to start consuming: %w", err)
	}

	c.logger.Info("UserConsumer waiting for messages...")

	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-msgs:
			if !ok {
				return fmt.Errorf("channel closed")
			}
			c.logger.Info("Received message", "routing_key", d.RoutingKey)

			// Unmarshal Protobuf
			var event pb.UserCreated
			if err := proto.Unmarshal(d.Body, &event); err != nil {
				c.logger.Error("Failed to unmarshal event", "error", err)
				if nackErr := d.Nack(false, false); nackErr != nil {
					c.logger.Error("Failed to Nack message", "error", nackErr)
				}
				continue
			}

			// Map to Domain DTO
			// We use UserId as EventID for idempotency because a user is created only once.
			userID, err := uuid.Parse(event.UserId)
			if err != nil {
				c.logger.Error("Invalid UserID UUID", "error", err)
				d.Nack(false, false)
				continue
			}

			userEvent := userstats.UserCreatedEvent{
				EventID:     userID, // Using UserID as EventID
				UserID:      userID,
				Email:       event.Email,
				FullName:    event.FullName,
				CountryCode: event.CountryCode,
				CreatedAt:   event.CreatedAt.AsTime(),
			}

			// Call Service (Idempotent)
			if err := c.service.ProcessUserCreated(ctx, userEvent); err != nil {
				c.logger.Error("Failed to process event", "error", err)
				// Nack(true) to requeue and retry
				if nackErr := d.Nack(false, true); nackErr != nil {
					c.logger.Error("Failed to Nack message (requeue)", "error", nackErr)
				}
			} else {
				// Ack on success
				if ackErr := d.Ack(false); ackErr != nil {
					c.logger.Error("Failed to Ack message", "error", ackErr)
				}
				c.logger.Info("Successfully processed user created event", "user_id", event.UserId)
			}
		}
	}
}

func (c *UserConsumer) setupRabbitMQ(ch *amqp.Channel) error {
	err := ch.ExchangeDeclare(
		"auction.events", // name
		"topic",          // type
		true,             // durable
		false,            // auto-deleted
		false,            // internal
		false,            // no-wait
		nil,              // args
	)
	if err != nil {
		return err
	}

	q, err := ch.QueueDeclare(
		"user_stats_users", // name
		true,               // durable
		false,              // delete when unused
		false,              // exclusive
		false,              // no-wait
		nil,                // args
	)
	if err != nil {
		return err
	}

	return ch.QueueBind(
		q.Name,           // queue name
		"user.created",   // routing key
		"auction.events", // exchange
		false,
		nil,
	)
}
