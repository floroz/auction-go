FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install git for potential dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY pkg/ pkg/
COPY services/bid-service/ services/bid-service/

# Build binaries
RUN go build -o /bin/bid-service ./services/bid-service/cmd/api/main.go
RUN go build -o /bin/bid-worker ./services/bid-service/cmd/worker/main.go

# Final Stage
FROM alpine:3.21
WORKDIR /app

# Copy binaries
COPY --from=builder /bin/bid-service /app/bid-service
COPY --from=builder /bin/bid-worker /app/bid-worker

# Default command (can be overridden)
CMD ["/app/bid-service"]

