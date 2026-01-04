/**
 * JWT Utilities Tests
 *
 * These tests verify JWT token decoding and verification.
 * Note: These are unit tests for the JWT helper functions.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { verifyToken, initializeJWT } from "./jwt";
import { readFile } from "fs/promises";
import { SignJWT } from "jose";
import { createPrivateKey } from "crypto";
import { env } from "./env";

describe("JWT Utilities", () => {
  let validToken: string;
  let expiredToken: string;
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeAll(async () => {
    // Initialize JWT module before tests (simulates server startup)
    await initializeJWT();

    // Load private key for testing (PKCS#1 RSA format)
    const privateKeyPEM = await readFile("../.data/keys/private.pem", "utf-8");

    // Convert PKCS#1 to KeyObject for jose
    const privateKey = createPrivateKey({
      key: privateKeyPEM,
      format: "pem",
    });

    // Create a valid token
    validToken = await new SignJWT({
      email: "test@example.com",
      full_name: "Test User",
      permissions: ["read:bids"],
    })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject(userId)
      .setIssuer(env.JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(privateKey);

    // Create an expired token
    expiredToken = await new SignJWT({
      email: "test@example.com",
      full_name: "Test User",
      permissions: ["read:bids"],
    })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject(userId)
      .setIssuer(env.JWT_ISSUER)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800) // 30 min ago
      .sign(privateKey);
  });

  describe("verifyToken", () => {
    it("should verify and decode a valid token", async () => {
      const claims = await verifyToken(validToken);

      expect(claims.sub).toBe(userId);
      expect(claims.email).toBe("test@example.com");
      expect(claims.fullName).toBe("Test User");
      expect(claims.iss).toBe(env.JWT_ISSUER);
      expect(claims.permissions).toEqual(["read:bids"]);
    });

    it("should throw error for expired token", async () => {
      await expect(verifyToken(expiredToken)).rejects.toThrow(
        /JWT verification failed/,
      );
    });

    it("should throw error for invalid token", async () => {
      await expect(verifyToken("invalid.token.here")).rejects.toThrow(
        /JWT verification failed/,
      );
    });

    it("should throw error for tampered token", async () => {
      // Tamper with the token by changing a character
      const tamperedToken = validToken.slice(0, -5) + "XXXXX";

      await expect(verifyToken(tamperedToken)).rejects.toThrow(
        /JWT verification failed/,
      );
    });
  });
});
