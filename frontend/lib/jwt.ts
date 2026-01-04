/**
 * JWT Utilities (SERVER-ONLY)
 *
 * This module provides JWT decoding and verification using the public key.
 * The BFF uses this to extract user claims (userId, email, etc.) from tokens.
 *
 * Bootstrap Initialization:
 * - Public key is loaded once at server startup via instrumentation.ts
 * - Fail-fast: Server won't start if key is missing or invalid
 * - Zero file I/O after initialization
 *
 * Security:
 * - Uses RS256 (RSA public key verification)
 * - Verifies signature and expiration
 * - Only decodes tokens already validated by the auth service
 */

import { jwtVerify, importSPKI } from "jose";
import { readFile } from "fs/promises";
import { fromJson, type JsonValue } from "@bufbuild/protobuf";
import {
  type TokenClaims,
  TokenClaimsSchema,
} from "../proto/auth/v1/auth_service_pb";
import { env } from "./env";

export type { TokenClaims };

// Public key loaded at startup (via initializeJWT)
let publicKey: CryptoKey | null = null;

/**
 * Initialize JWT verification by loading the public key
 * MUST be called once at server startup (via instrumentation.ts)
 *
 * @throws Error if key cannot be loaded (fail-fast)
 */
export async function initializeJWT(): Promise<void> {
  if (publicKey) {
    console.log("⚠️  JWT already initialized, skipping");
    return;
  }

  try {
    const publicKeyPEM = await readFile(env.JWT_PUBLIC_KEY_PATH, "utf-8");
    publicKey = await importSPKI(publicKeyPEM, "RS256");
    console.log(`📄 Loaded JWT public key from: ${env.JWT_PUBLIC_KEY_PATH}`);
  } catch (error) {
    console.error("❌ Failed to load JWT public key:", error);
    if (error instanceof Error) {
      throw new Error(
        `JWT initialization failed: ${error.message}. Check JWT_PUBLIC_KEY_PATH env var.`,
      );
    }
    throw new Error("JWT initialization failed - cannot start server");
  }
}

/**
 * Get the loaded public key
 * @throws Error if JWT not initialized (should never happen in production)
 */
function getPublicKey(): CryptoKey {
  if (!publicKey) {
    throw new Error(
      "JWT not initialized - initializeJWT() must be called at startup",
    );
  }
  return publicKey;
}

/**
 * Decode and verify JWT token
 * Returns the claims if valid, throws error if invalid
 *
 * @param token - The JWT access token
 * @returns Decoded and verified JWT claims
 * @throws Error if token is invalid, expired, or signature verification fails
 */
export async function verifyToken(token: string): Promise<TokenClaims> {
  const key = getPublicKey();

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: env.JWT_ISSUER,
      algorithms: ["RS256"],
    });

    // Use generated protobuf schema to validate and parse claims
    // This handles mapping snake_case JSON fields to camelCase TS properties
    return fromJson(TokenClaimsSchema, payload as JsonValue) as TokenClaims;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error("JWT verification failed");
  }
}
