/**
 * Auth API Schemas
 *
 * This module defines the API contract between the browser and the BFF layer.
 * These schemas represent what the browser sends and receives, NOT the internal
 * gRPC payloads (which include server-side enrichment like IP address, user agent).
 */

import { z } from "zod";

/**
 * Login Input Schema
 * Browser → BFF: User-provided login credentials
 */
export const loginInputSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Register Input Schema
 * Browser → BFF: User-provided registration information
 */
export const registerInputSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must not exceed 100 characters"),
  countryCode: z
    .string()
    .length(2, "Country code must be 2 characters")
    .regex(/^[A-Z]{2}$/, "Must be uppercase ISO 3166-1 alpha-2"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

/**
 * Auth Response Schema
 * BFF → Browser: Response after successful authentication
 * Note: Tokens are NOT included here - they're set as HttpOnly cookies
 */
export const authResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
});

/**
 * User Session Schema
 * BFF → Browser: Current authenticated user information
 * Used for route loaders and client-side user context
 */
export const userSessionSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
});

/**
 * Logout Response Schema
 * BFF → Browser: Response after logout
 */
export const logoutResponseSchema = z.object({
  success: z.boolean(),
});

// Type exports for TypeScript consumers
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
