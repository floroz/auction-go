import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const isServer = typeof window === 'undefined'

/**
 * Environment variables - all embedded at build time via Vite.
 *
 * Since all URLs are static and known at build time, we use VITE_* prefix
 * for everything. This simplifies the setup - no runtime env vars needed.
 *
 * - Browser: Uses VITE_API_URL (ingress routes requests by path)
 * - SSR: Uses VITE_*_SERVICE_URL for direct K8s service communication
 */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    // Client-facing API URL (browser → ingress)
    VITE_API_URL: z.url(),
    // Direct K8s service URLs (SSR → services)
    VITE_AUTH_SERVICE_URL: z.url(),
    VITE_BID_SERVICE_URL: z.url(),
    VITE_USER_STATS_SERVICE_URL: z.url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})
