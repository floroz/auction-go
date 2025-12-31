import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { AuthService } from '../../proto/auth/v1/auth_service_pb'
import { UserStatsService } from '../../proto/userstats/v1/user_stats_service_pb'
import { BidService } from '../../proto/bids/v1/bid_service_pb'
import { env, isServer } from '@/env'

/**
 * Returns the appropriate URL for a specific service.
 * - Server (SSR): Uses direct K8s service URL for lower latency
 * - Client (browser): Uses API_URL (ingress routes by path)
 */
function getServiceUrl(service: 'auth' | 'bid' | 'user-stats'): string {
  if (isServer) {
    switch (service) {
      case 'auth':
        return env.VITE_AUTH_SERVICE_URL
      case 'bid':
        return env.VITE_BID_SERVICE_URL
      case 'user-stats':
        return env.VITE_USER_STATS_SERVICE_URL
    }
  }
  return env.VITE_API_URL
}

const authTransport = createConnectTransport({
  baseUrl: getServiceUrl('auth'),
})

const bidTransport = createConnectTransport({
  baseUrl: getServiceUrl('bid'),
})

const userStatsTransport = createConnectTransport({
  baseUrl: getServiceUrl('user-stats'),
})

export const authClient = createClient(AuthService, authTransport)
export const bidClient = createClient(BidService, bidTransport)
export const userStatsClient = createClient(
  UserStatsService,
  userStatsTransport,
)
