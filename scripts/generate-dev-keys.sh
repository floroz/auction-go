#!/bin/bash
set -e

KEY_DIR=".data/keys"
PRIVATE_KEY="$KEY_DIR/private.pem"
PUBLIC_KEY="$KEY_DIR/public.pem"

mkdir -p "$KEY_DIR"

if [ -f "$PRIVATE_KEY" ] && [ -f "$PUBLIC_KEY" ]; then
    echo "Keys already exist in $KEY_DIR"
    exit 0
fi

echo "Generating new RSA keys in $KEY_DIR..."

# Generate Private Key
openssl genrsa -out "$PRIVATE_KEY" 2048

# Generate Public Key
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY"

echo "Keys generated successfully."

