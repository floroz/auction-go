#!/bin/bash
set -e

# Navigate to frontend directory (script can be run from anywhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$FRONTEND_DIR")"

echo "Generating TypeScript protobuf files..."

# Check if protoc-gen-es is available
if [ ! -f "$FRONTEND_DIR/node_modules/.bin/protoc-gen-es" ]; then
  echo "Error: protoc-gen-es not found. Run 'pnpm install' first."
  exit 1
fi

# Check for protoc - prefer local project installation, fall back to system
PROTOC=""
if [ -f "$PROJECT_ROOT/tools/protoc" ]; then
  PROTOC="$PROJECT_ROOT/tools/protoc"
elif command -v protoc >/dev/null 2>&1; then
  PROTOC="protoc"
else
  echo "Error: protoc not found."
  echo "Either install protoc globally or run 'make install-protoc' from the project root."
  exit 1
fi

echo "Using protoc: $PROTOC"

# Create output directory
mkdir -p "$FRONTEND_DIR/proto"

# Generate TypeScript files
"$PROTOC" \
  --plugin=protoc-gen-es="$FRONTEND_DIR/node_modules/.bin/protoc-gen-es" \
  --es_out="$FRONTEND_DIR/proto" \
  --es_opt=target=ts \
  --proto_path="$PROJECT_ROOT/api/proto" \
  --proto_path="$PROJECT_ROOT/tools/include" \
  "$PROJECT_ROOT/api/proto/bids/v1/bid_service.proto" \
  "$PROJECT_ROOT/api/proto/userstats/v1/user_stats_service.proto" \
  "$PROJECT_ROOT/api/proto/auth/v1/auth_service.proto"

echo "TypeScript protobuf files generated in frontend/proto/"
