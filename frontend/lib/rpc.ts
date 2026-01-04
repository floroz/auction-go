/**
 * RPC Client Configuration (SERVER-ONLY)
 *
 * This module creates ConnectRPC clients for communication between the BFF (Next.js server)
 * and internal backend microservices. These clients are ONLY used in:
 * - Server Components
 * - Server Actions
 * - API Routes
 *
 * NEVER import this file in client components ("use client").
 */

import { createConnectTransport } from "@connectrpc/connect-node";
import { createClient } from "@connectrpc/connect";
import { AuthService } from "@/proto/auth/v1/auth_service_pb";
import { BidService } from "@/proto/bids/v1/bid_service_pb";
import { UserStatsService } from "@/proto/userstats/v1/user_stats_service_pb";
import { env } from "./env";

const SERVICE_URLS = {
  auth: env.AUTH_SERVICE_URL,
  bid: env.BID_SERVICE_URL,
  userStats: env.USER_STATS_SERVICE_URL,
} as const;

// Create transports for each service using centralized config
const authTransport = createConnectTransport({
  baseUrl: SERVICE_URLS.auth,
  httpVersion: "1.1",
});

const bidTransport = createConnectTransport({
  baseUrl: SERVICE_URLS.bid,
  httpVersion: "1.1",
});

const statsTransport = createConnectTransport({
  baseUrl: SERVICE_URLS.userStats,
  httpVersion: "1.1",
});

// Export typed clients
export const authClient = createClient(AuthService, authTransport);
export const bidClient = createClient(BidService, bidTransport);
export const statsClient = createClient(UserStatsService, statsTransport);
