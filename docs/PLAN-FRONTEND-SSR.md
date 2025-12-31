# SSR RPC Integration Plan

We will generate the Connect RPC client, configure per-service API URLs for server/client environments, and create a sandbox route to validate data fetching in both environments.

## Architecture Overview

```
Browser:
  All RPC clients → http://api.gavel.local (ingress routes by path)

Server (SSR):
  authClient      → http://auth-service.default.svc.cluster.local (direct)
  userStatsClient → http://user-stats-service.default.svc.cluster.local (direct)
  bidClient       → http://bid-service.default.svc.cluster.local (direct)
```

This pattern provides:
- **Isomorphic call sites**: `userStatsClient.getUserStats()` works identically in browser and SSR
- **Direct service-to-service communication**: SSR bypasses ingress for lower latency
- **No Host header issues**: Direct K8s service DNS doesn't require ingress routing
- **Standard Kubernetes pattern**: Internal services call each other directly

## 1. Setup & Configuration

### Proto Generation
Run `make proto-gen-ts` to ensure TypeScript clients are up-to-date.

### Environment Variables

Update the following files:

#### `frontend/.env.example`
```bash
# Client-side API URL (browser → ingress)
VITE_API_URL=http://api.gavel.local

# Server-side per-service URLs (SSR → direct K8s service DNS)
SERVER_AUTH_SERVICE_URL=http://auth-service.default.svc.cluster.local
SERVER_BID_SERVICE_URL=http://bid-service.default.svc.cluster.local
SERVER_USER_STATS_SERVICE_URL=http://user-stats-service.default.svc.cluster.local
```

#### `frontend/src/env.ts`
Add server-side environment variables:
```typescript
server: {
  SERVER_AUTH_SERVICE_URL: z.url().optional(),
  SERVER_BID_SERVICE_URL: z.url().optional(),
  SERVER_USER_STATS_SERVICE_URL: z.url().optional(),
},
```

Add helper function:
```typescript
/**
 * Returns the appropriate URL for a specific service.
 * - Server (SSR): Uses direct K8s service URL for that service
 * - Client (browser): Uses VITE_API_URL (ingress routes by path)
 */
export function getServiceUrl(service: 'auth' | 'bid' | 'user-stats'): string {
  const isServer = typeof window === 'undefined'
  if (isServer) {
    switch (service) {
      case 'auth':
        if (env.SERVER_AUTH_SERVICE_URL) return env.SERVER_AUTH_SERVICE_URL
        break
      case 'bid':
        if (env.SERVER_BID_SERVICE_URL) return env.SERVER_BID_SERVICE_URL
        break
      case 'user-stats':
        if (env.SERVER_USER_STATS_SERVICE_URL) return env.SERVER_USER_STATS_SERVICE_URL
        break
    }
  }
  return env.VITE_API_URL
}
```

Remove the old `getApiUrl()` function and `SERVER_API_URL`/`SERVER_API_HOST` variables if present.

#### `deploy/charts/frontend/values.yaml`
```yaml
config:
  assetUrl: ""
  apiUrl: "http://api.gavel.local"
  serverAuthServiceUrl: "http://auth-service.default.svc.cluster.local"
  serverBidServiceUrl: "http://bid-service.default.svc.cluster.local"
  serverUserStatsServiceUrl: "http://user-stats-service.default.svc.cluster.local"
```

#### `deploy/charts/frontend/templates/deployment.yaml`
```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: VITE_ASSET_URL
    value: {{ .Values.config.assetUrl | quote }}
  - name: VITE_API_URL
    value: {{ .Values.config.apiUrl | quote }}
  - name: SERVER_AUTH_SERVICE_URL
    value: {{ .Values.config.serverAuthServiceUrl | quote }}
  - name: SERVER_BID_SERVICE_URL
    value: {{ .Values.config.serverBidServiceUrl | quote }}
  - name: SERVER_USER_STATS_SERVICE_URL
    value: {{ .Values.config.serverUserStatsServiceUrl | quote }}
```

## 2. RPC Client Implementation

#### `frontend/src/lib/rpc.ts`

Create per-service transports that resolve URLs based on environment:

```typescript
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { AuthService } from '../../proto/auth/v1/auth_service_pb'
import { UserStatsService } from '../../proto/userstats/v1/user_stats_service_pb'
import { BidService } from '../../proto/bids/v1/bid_service_pb'
import { getServiceUrl } from '../env'

// Each service gets its own transport with environment-aware URL resolution
const authTransport = createConnectTransport({
  baseUrl: getServiceUrl('auth'),
})

const bidTransport = createConnectTransport({
  baseUrl: getServiceUrl('bid'),
})

const userStatsTransport = createConnectTransport({
  baseUrl: getServiceUrl('user-stats'),
})

// Exported clients - call sites are 100% isomorphic
export const authClient = createClient(AuthService, authTransport)
export const bidClient = createClient(BidService, bidTransport)
export const userStatsClient = createClient(UserStatsService, userStatsTransport)
```

**Key points:**
- Multiple transports have negligible overhead (config objects only, no connection pools)
- URL resolution happens once at module initialization
- Call sites are completely isomorphic - no environment checks needed

## 3. Sandbox Route

#### `frontend/src/routes/demo/sandbox.tsx`

- **SSR Validation**: Uses `loader` to fetch `UserStats` via RPC client. This runs on the server during initial load.
- **Client Validation**: Add a button/interaction to trigger the same RPC call from the browser.
- **Display results** to confirm both environments work.
- **Use valid UUIDs** for test user IDs (e.g., `00000000-0000-0000-0000-000000000001`) as the backend validates UUID format.

## 4. Verification

After implementation:

1. Deploy with `tilt up`
2. Navigate to `http://app.gavel.local/demo/sandbox`
3. Verify SSR section shows response from server (check for `[not_found]` error - expected since test user doesn't exist)
4. Click client button and verify browser request also works
5. Check frontend pod logs: `kubectl logs deploy/frontend`
6. Check ingress logs for client requests: `kubectl logs -n ingress-nginx deploy/nginx-ingress-ingress-nginx-controller`

## Why This Pattern?

| Aspect | Single URL (via ingress) | Per-service URLs (direct) |
|--------|-------------------------|--------------------------|
| Network hops (SSR) | 2 (pod → ingress → service) | 1 (pod → service) |
| Host header issues | Yes (Node.js ignores Host) | None |
| Latency | Higher | Lower |
| Configuration | 1 env var | 3 env vars |
| Kubernetes pattern | Non-standard | Standard |

The per-service URL approach is the standard pattern for internal service-to-service communication in Kubernetes. The BFF/SSR server is a trusted internal component that can call services directly.
