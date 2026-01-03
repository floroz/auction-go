# Authentication Architecture: Backend for Frontend (BFF)

## 1. The Challenge

Our application uses a microservices architecture with a dedicated **Auth Service** (Go/gRPC) and a **Frontend** built with Next.js (App Router, SSR/React).

We face three critical challenges with the traditional "Direct Browser-to-Microservice" authentication pattern:

1.  **Security**: Storing JWTs in `localStorage` exposes users to XSS attacks.
2.  **Server-Side Rendering (SSR)**: The Node.js SSR server cannot access `localStorage`, causing "flashes of unauthenticated content" (rendering as guest first, then hydration logs the user in).
3.  **Token Management**: Implementing silent refresh logic (handling 401s, refreshing tokens, retrying requests) in the browser is complex and error-prone.

## 2. The Solution: Backend for Frontend (BFF)

We will implement the **Backend for Frontend (BFF)** pattern (also known as the "Token Handler" pattern).

In this architecture, the **Frontend Server (Node.js)** acts as a secure proxy between the Browser and the Microservices.

### Key Concepts

*   **HttpOnly Cookies**: The browser never sees the Access/Refresh tokens. It only holds encrypted/signed HttpOnly cookies containing the tokens.
*   **Server Actions**: The browser calls Next.js Server Actions (e.g., `loginAction`, `placeBidAction`) instead of calling Microservices directly.
*   **Token Mediation**: The Frontend Server reads the cookies, attaches the `Authorization: Bearer <token>` header, and forwards the request to the gRPC services.
*   **Server-Side Refresh**: If a microservice returns `401 Unauthorized`, the Frontend Server transparently calls `AuthService.Refresh`, updates the user's cookies, and retries the original request.

## 3. Implementation Strategy

### A. Components

1.  **Frontend Server (BFF)**: Next.js App Router with Server Components and Server Actions handling the proxy logic.
2.  **Internal Services**: `auth-service`, `bid-service`, `user-stats-service` (Not exposed publicly).
3.  **Frontend Ingress**: The ONLY public entry point.

### B. Architecture Impact

*   **Traffic Flow**:
    *   **Public**: Browser → NGINX Ingress → Frontend Node Pod (BFF)
    *   **Private**: Frontend Node Pod → (K8s Service DNS) → Auth/Bid Service
*   **Ingress Changes**:
    *   **KEEP**: Frontend Ingress (TLS, Load Balancing).
    *   **DELETE**: Ingress resources for `auth-service`, `bid-service`, and `user-stats-service`.
*   **Security Improvements**:
    *   **Zero Trust**: Backend services are no longer exposed to the public internet.
    *   **CORS Elimination**: No CORS configuration needed on backends; all browser requests are same-origin to the Frontend.
    *   **Token Safety**: Tokens never leave the server-side environment.
*   **UX**: Perfect SSR support. The server knows the user identity immediately upon request receipt.

## 4. Communication Architecture

### The Problem

Previously, our `rpc.ts` was designed for direct Browser→Backend communication:

```
Browser ─────ConnectRPC────▶ auth-service (public)
Browser ─────ConnectRPC────▶ bid-service (public)
```

With BFF, backends become private. We need two distinct communication layers:

```
Browser ───Server Actions───▶ BFF (public)
BFF ────────ConnectRPC──────▶ Backend Services (private)
```

### A. Browser → BFF: Next.js Server Actions

**Why Server Actions (not ConnectRPC from browser)**:
- Automatic cookie handling (no manual `credentials: 'include'`)
- Type-safe with Zod validation
- Same function callable from SSR and client hydration
- No additional HTTP layer to maintain
- Framework-native solution with excellent DX

**Pattern**:

```typescript
// app/actions/auth.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/rpc";
import { loginInputSchema } from "@/shared/api/auth";

export async function loginAction(formData: FormData) {
  const parsed = loginInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid credentials" };
  }

  const response = await authClient.login({
    email: parsed.data.email,
    password: parsed.data.password,
    ipAddress: headers().get("x-forwarded-for") ?? "unknown",
    userAgent: headers().get("user-agent") ?? "unknown",
  });

  // Set HttpOnly cookies (tokens never returned to browser)
  const cookieStore = await cookies();
  cookieStore.set("access_token", response.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });
  cookieStore.set("refresh_token", response.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  redirect("/dashboard");
}
```

### B. BFF → Backend Services: ConnectRPC (Internal)

**Location**: `lib/rpc.ts`

This is server-only code. The ConnectRPC clients are used exclusively by Server Components and Server Actions:

```typescript
// lib/rpc.ts (SERVER-ONLY)
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { AuthService } from "@/proto/auth/v1/auth_service_pb";
import { BidService } from "@/proto/bids/v1/bid_service_pb";

// Direct K8s service URLs (cluster-internal)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const BID_SERVICE_URL = process.env.BID_SERVICE_URL!;

const authTransport = createConnectTransport({
  baseUrl: AUTH_SERVICE_URL,
  httpVersion: "1.1",
});

const bidTransport = createConnectTransport({
  baseUrl: BID_SERVICE_URL,
  httpVersion: "1.1",
});

export const authClient = createClient(AuthService, authTransport);
export const bidClient = createClient(BidService, bidTransport);
```

### C. Request Types

| Request Type | Flow | Token Handling |
|--------------|------|----------------|
| **SSR Data Fetch** | React Server Component → Backend | Read cookie, attach Bearer header |
| **Client Mutation** | Browser → Server Action → Backend | Cookie sent automatically, server reads it |
| **Client Query** | Browser → Server Action → Backend | Same as mutation |

### D. Server Components vs Server Actions

| Pattern | Use Case | Example |
|---------|----------|---------|
| **React Server Components** | Data fetching, rendering protected pages | Dashboard, Profile, Auction list |
| **Server Actions** | Mutations, form submissions | Login, Register, Place Bid, Logout |

**RSCs for Data Fetching** (unlimited parallelism):
```typescript
// app/dashboard/page.tsx (Server Component - default)
import { requireAuth } from "@/lib/auth";
import { statsClient } from "@/lib/rpc";

export default async function DashboardPage() {
  const session = await requireAuth();
  
  const stats = await statsClient.getUserStats(
    { userId: session.userId },
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  return <DashboardView stats={stats} />;
}
```

**Server Actions for Mutations**:
```typescript
// app/actions/bids.ts
"use server";

import { getSession } from "@/lib/auth";
import { bidClient } from "@/lib/rpc";

export async function placeBidAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const response = await bidClient.placeBid(
    {
      itemId: formData.get("itemId") as string,
      amount: Number(formData.get("amount")),
    },
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );

  return { success: true, bidId: response.bidId };
}
```

## 5. Auth Flows

### Registration

1. User submits registration form in browser
2. Browser calls `registerAction` Server Action
3. BFF calls `auth-service.Register` via ConnectRPC
4. BFF calls `auth-service.Login` (or Register returns tokens directly)
5. BFF sets HttpOnly cookies with tokens
6. BFF returns success response (no tokens in body)
7. Server Action redirects to authenticated page

### Login

1. User submits login form in browser
2. Browser calls `loginAction` Server Action
3. BFF calls `auth-service.Login` via ConnectRPC
4. BFF sets HttpOnly cookies with tokens
5. BFF returns success response (no tokens in body)
6. Server Action redirects to authenticated page

### Navigate to Protected Route

1. User navigates to a protected route
2. Browser sends request with cookies
3. Next.js middleware performs lightweight check (cookies present?)
4. React Server Component calls `requireAuth()`:
   - Reads `access_token` cookie
   - If expired but `refresh_token` is valid:
     - BFF calls `auth-service.Refresh`
     - BFF updates cookies with new tokens
   - If no valid tokens, redirect to `/login`
5. RSC fetches data from backend with Bearer token
6. BFF returns SSR-rendered protected page

### Logout

1. User clicks logout
2. Browser calls `logoutAction` Server Action
3. BFF calls `auth-service.Logout` to revoke refresh token
4. BFF clears all auth cookies
5. Server Action redirects to public page

## 6. Decisions & Validation

We have validated the BFF pattern against performance and architectural concerns:

1.  **BFF as Bottleneck**:
    *   **Concern**: Does proxying all traffic through Node.js create a bottleneck?
    *   **Decision**: Accepted. Node.js is efficient at I/O-bound tasks (proxying). If load becomes an issue, we will horizontally scale the Frontend/BFF pods.

2.  **Event Loop Blocking**:
    *   **Concern**: Will combining SSR (CPU-bound) and Proxying (I/O-bound) block the loop?
    *   **Decision**: Accepted trade-off. Proxying yields the event loop. If SSR becomes too heavy, we can split the architecture into "Rendering Pods" and "Gateway/BFF Pods" in the future.

3.  **Role of NGINX**:
    *   **Concern**: Do we still need NGINX if the BFF handles auth?
    *   **Decision**: Yes, but only for the Frontend.
    *   **Change**: We will remove Ingresses for all backend microservices. They will become private, accessible only via the BFF within the cluster. This significantly reduces the attack surface and simplifies network configuration.

4.  **Why Not ConnectRPC from Browser?**:
    *   **Concern**: We already have ConnectRPC clients. Why add Server Actions?
    *   **Decision**: Server Actions provide automatic cookie handling, type safety, and work seamlessly in both SSR and client contexts. ConnectRPC is still used, but only for BFF→Backend communication where it excels (gRPC, streaming, etc.).

5.  **Server Actions Parallelism**:
    *   **Concern**: Next.js limits concurrent Server Actions to 11 per client.
    *   **Decision**: Non-issue. We use RSCs for data fetching (no limit) and reserve Server Actions for mutations only (sequential by nature).

6.  **Middleware Runtime**:
    *   **Concern**: Should we use Edge or Node.js runtime for middleware?
    *   **Decision**: Keep middleware lightweight regardless of runtime. Token refresh happens in RSC/Server Actions, not middleware. This is more performant (refresh only when needed) and easier to debug.

## 7. Operational Details

### Cookies

| Cookie | Attributes | TTL | Purpose |
|--------|------------|-----|---------|
| `access_token` | HttpOnly, Secure, SameSite=Strict, Path=/ | ~15 min | Short-lived auth token |
| `refresh_token` | HttpOnly, Secure, SameSite=Strict, Path=/ | 7 days | Token rotation (sliding window) |

**Cookie Security Notes**:
- `SameSite=Strict` provides CSRF protection for mutations
- With `SameSite=Strict`, explicit CSRF tokens are not required for POST requests
- Refresh token uses sliding window: each refresh extends the 7-day window
- Reuse detection: if a refresh token is used after rotation, revoke all user tokens
- `Secure` flag is enforced in production (requires HTTPS)
- In local development, `Secure=false` to allow HTTP

**Note on `__Host-` Prefix**:
The `__Host-` prefix provides additional security guarantees but requires `Secure=true`, which doesn't work in local HTTP development. We omit the prefix and rely on our other security measures (HttpOnly, SameSite=Strict, same-origin).

### Cookie Management Utility

```typescript
// lib/cookies.ts
import { cookies } from "next/headers";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function getAuthCookies() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get("access_token")?.value,
    refreshToken: cookieStore.get("refresh_token")?.value,
  };
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}
```

### Auth Request Handling

**Browser Transport**:
- Server Actions handle cookie transmission automatically
- No `credentials: 'include'` needed—cookies are read server-side

**Server/SSR Transport**:
- Read `access_token` from cookie
- Attach `Authorization: Bearer <access_token>` to upstream service calls
- If 401 received:
  1. Read `refresh_token` from cookie
  2. Call `auth-service.Refresh`
  3. Update cookies with new tokens
  4. Retry original request once
  5. If still 401, clear cookies and return unauthorized

### Auth Utility

```typescript
// lib/auth.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "./rpc";
import { setAuthCookies, getAuthCookies, clearAuthCookies } from "./cookies";

export async function getSession() {
  const { accessToken, refreshToken } = await getAuthCookies();

  // No tokens at all
  if (!accessToken && !refreshToken) {
    return null;
  }

  // Access token exists - return it (backend validates)
  if (accessToken) {
    return { accessToken };
  }

  // Access token expired, but refresh token exists - try refresh
  if (refreshToken) {
    try {
      const response = await authClient.refresh({ refreshToken });
      await setAuthCookies(response.accessToken, response.refreshToken);
      return { accessToken: response.accessToken };
    } catch {
      // Refresh failed - clear cookies
      await clearAuthCookies();
      return null;
    }
  }

  return null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
```

### Middleware (Lightweight)

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/auctions"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Quick check: do we have any auth cookies?
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // No tokens at all - redirect immediately (fast path)
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Tokens exist - let the RSC handle validation/refresh
  // This avoids making network calls in middleware
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
```

### Network Shape

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Ingress                                 │
│                    (TLS Termination)                             │
│                    app.gavel.local                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                 KUBERNETES CLUSTER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Frontend Pod (BFF)                            │  │
│  │              - Next.js App Router (SSR)                    │  │
│  │              - React Server Components                     │  │
│  │              - Server Actions                              │  │
│  │              - Cookie Management                           │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │ (K8s Service DNS)                     │
│         ┌────────────────┼────────────────┐                      │
│         ▼                ▼                ▼                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐               │
│  │auth-service│   │bid-service │   │user-stats  │               │
│  │  (private) │   │  (private) │   │  (private) │               │
│  └────────────┘   └────────────┘   └────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 8. JWT Validation & Key Management

### Backend JWT Validation

Each backend service needs to validate JWTs sent by the BFF:

1. **Shared Public Key**: Auth-service signs JWTs with a private key. Other services validate with the corresponding public key.
2. **Key Distribution**: Public key is distributed via:
   - Kubernetes Secret mounted to all service pods, OR
   - JWKS endpoint exposed by auth-service (cluster-internal)

### Validation Flow

```
BFF ──Bearer Token──▶ bid-service
                           │
                           ▼
                    Validate JWT signature (public key)
                    Check expiry (exp claim)
                    Extract user claims (sub, email, permissions)
                           │
                           ▼
                    Process request with user context
```

### Key Rotation

- Generate new key pair
- Auth-service starts signing with new key
- Both old and new public keys are valid during transition
- After token TTL passes, remove old public key

## 9. Session Invalidation Strategy

### Scenarios

| Event | Action |
|-------|--------|
| **User logs out** | Revoke refresh token, clear cookies |
| **Password change** | Revoke ALL user's refresh tokens |
| **Admin revokes user** | Revoke ALL tokens + add user to short-lived deny list |
| **Security breach** | Rotate signing keys (invalidates all access tokens) |

### Implementation

**Refresh Token Revocation** (already implemented):
- Refresh tokens stored in DB with `revoked` flag
- On logout/password change: `UPDATE refresh_tokens SET revoked = true WHERE user_id = ?`

**Immediate Access Token Invalidation** (for admin revocation):
- Option A: Short access token TTL (15 min) means natural expiry handles most cases
- Option B: Redis deny list for user IDs (checked on each request, TTL = access token lifetime)

## 10. References

*   **Auth0**: [The Backend for Frontend Pattern](https://auth0.com/blog/backend-for-frontend-pattern-with-auth0-and-dotnet/)
*   **OWASP**: [Local Storage Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
*   **Curity**: [The Token Handler Pattern](https://curity.io/resources/learn/token-handler-pattern/)
*   **Next.js**: [Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
*   **Next.js**: [Cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies)

## 11. Implementation Milestones

### Milestone 1: Environment & Key Infrastructure
**Goal**: Ensure local and k8s environments have the necessary keys for JWT signing and validation.

*   [ ] **Generate Keys**: Create RSA key pair for JWT signing (if not exists).
*   [ ] **Auth Service Config**: Configure `auth-service` to use the private key for signing.
*   [ ] **BFF RPC Setup**: Create `lib/rpc.ts` with ConnectRPC clients for internal backend communication.
*   [ ] **Environment Variables**: Configure `AUTH_SERVICE_URL`, `BID_SERVICE_URL`, etc., in the frontend environment.

**Validation**:
*   `auth-service` starts successfully with the private key.
*   Frontend server starts and `lib/rpc.ts` can initialize clients (even if not connecting yet).

### Milestone 2: BFF Core (Auth & Cookies)
**Goal**: Implement Server Actions for Login/Register and handle HttpOnly cookies.

*   [ ] **Cookie Logic**: Implement `lib/cookies.ts` (set/get/clear with `HttpOnly`, `Secure`, `SameSite=Strict`).
*   [ ] **Auth Actions**: Implement `app/actions/auth.ts`:
    *   `loginAction`: Calls backend -> Sets cookies -> Redirects.
    *   `registerAction`: Calls backend -> Sets cookies -> Redirects.
    *   `logoutAction`: Calls backend (revoke) -> Clears cookies -> Redirects.
*   [ ] **Frontend Forms**: Update Login and Register pages to use these Server Actions.

**Validation**:
*   Login form submits successfully.
*   Browser DevTools shows `access_token` and `refresh_token` cookies being set.
*   `document.cookie` in browser console is empty (cookies are HttpOnly).
*   Logout clears the cookies.

### Milestone 3: Route Protection & SSR
**Goal**: Protect routes and ensure authenticated state persists on reload (SSR).

*   [ ] **Auth Utility**: Implement `lib/auth.ts` with `getSession()` and `requireAuth()`.
*   [ ] **Token Refresh**: Implement refresh logic in `getSession()` to transparently refresh expired tokens.
*   [ ] **Middleware**: Create `middleware.ts` for lightweight auth checks and redirects.
*   [ ] **Protected Pages**: Update dashboard and other protected pages to use `requireAuth()`.

**Validation**:
*   Accessing `/dashboard` (protected) redirects to `/login` if logged out.
*   Refreshing the page while logged in keeps the user logged in (no flash of guest content).
*   Manually deleting `access_token` (but keeping refresh token) results in a new access token being set transparently on the next request.

### Milestone 4: Full Migration & Cleanup
**Goal**: Route all remaining traffic through BFF and close public access to backends.

*   [ ] **Bid/Stats Actions**: Create Server Actions for other domains (e.g., `placeBidAction`) using `lib/rpc.ts`.
*   [ ] **Remove Client RPC**: Ensure no direct browser-to-backend calls exist.
*   [ ] **Ingress Cleanup**: Remove Kubernetes Ingress resources for `auth-service`, `bid-service`, and `user-stats-service`.
*   [ ] **Network Policy**: (Optional) Enforce network policies so backends only accept traffic from the Frontend pod.

**Validation**:
*   All app features (bidding, stats) work correctly.
*   `curl https://auth.example.com` fails (public access blocked).
*   `curl https://bid.example.com` fails.
*   Only `https://app.gavel.local` is accessible.
