# Frontend Architecture Guide

## Overview

This document outlines the architectural patterns and conventions for the Gavel frontend application. We follow a **Hybrid Feature + Shared Architecture** to ensure scalability, maintainability, and clear separation of concerns.

## Core Principles

1. **Minimal RSC in `app/`**: The `app/` directory should contain only minimal React Server Components (RSC) that handle data fetching and routing.
2. **Feature Co-location**: All feature-specific code lives together in `features/`
3. **Shared Components**: Truly reusable components live in `components/shared/` or `components/ui/`
4. **Clear Boundaries**: Each feature is self-contained with its own components, hooks, types, and utilities

## Directory Structure

```
frontend/
├── app/                           # Next.js App Router - Minimal RSC
│   ├── auctions/
│   │   └── page.tsx              # RSC wrapper: data fetch + render view
│   ├── dashboard/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
│
├── features/                      # Feature-based modules
│   ├── auctions/
│   │   ├── components/           # Auction-specific components
│   │   ├── hooks/                # Auction-specific hooks
│   │   ├── lib/                  # Auction-specific utilities
│   │   ├── types.ts              # Auction-specific types
│   │   ├── auctions-view.tsx     # Main view component
│   │   └── index.ts              # Barrel export
│   ├── auth/
│   │   ├── login-view.tsx
│   │   ├── register-view.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── dashboard-view.tsx
│   │   └── index.ts
│   └── bids/                     # (Future feature)
│       ├── components/
│       ├── hooks/
│       ├── bids-view.tsx
│       └── index.ts
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── shared/                   # Truly reusable components
│       ├── logout-button.tsx
│       ├── navbar.tsx
│       └── (future: data-table, error-boundary, etc.)
│
├── actions/                      # Server actions
│   ├── auth.ts
│   └── bids.ts
│
├── lib/                          # Shared utilities
│   ├── api/
│   ├── auth.ts
│   ├── jwt.ts
│   └── utils.ts
│
└── shared/                       # Shared types and API definitions
    ├── api/
    │   ├── auth.ts
    │   ├── bids.ts
    │   └── index.ts
    └── types/
        ├── actions.ts
        ├── common.ts
        └── index.ts
```

## Conventions

### 1. App Directory Pattern

**Rule**: Keep `app/` pages minimal - they should only handle data fetching and render views.

**Good Example**:

```tsx
// app/bids/page.tsx
import { BidsView } from "@/features/bids";
import { getBids } from "@/actions/bids";

export default async function BidsPage() {
  const data = await getBids();
  return <BidsView bids={data} />;
}
```

**Bad Example**:

```tsx
// app/bids/page.tsx - DON'T DO THIS
"use client";

export default function BidsPage() {
  const [bids, setBids] = useState([]);
  // ... lots of logic, state, and UI code
  return (
    <div>
      {/* Complex UI directly in app/ */}
    </div>
  );
}
```

### 2. Feature Modules

**Structure**: Each feature should be self-contained with:

```
features/[feature-name]/
├── components/          # Feature-specific components
├── hooks/              # Feature-specific hooks
├── lib/                # Feature-specific utilities
├── types.ts            # Feature-specific types
├── [feature]-view.tsx  # Main view component (Client Component)
└── index.ts            # Barrel export
```

**Naming Convention**:
- Main view: `[feature]-view.tsx` (e.g., `bids-view.tsx`, `auctions-view.tsx`)
- Components: `[component-name].tsx` (e.g., `bid-form.tsx`, `auction-card.tsx`)
- Hooks: `use-[hook-name].ts` (e.g., `use-bid-submission.ts`)

**Example Feature Structure**:

```tsx
// features/bids/bids-view.tsx
"use client";

import { BidForm } from "./components/bid-form";
import { BidHistory } from "./components/bid-history";
import type { Bid } from "./types";

interface BidsViewProps {
  bids: Bid[];
}

export function BidsView({ bids }: BidsViewProps) {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">My Bids</h1>
      <BidForm />
      <BidHistory bids={bids} />
    </div>
  );
}
```

```ts
// features/bids/index.ts
export { BidsView } from "./bids-view";
export type * from "./types";
```

### 3. Shared Components

**When to use `components/shared/`**:
- Component is used across 3+ features
- Component is generic and not tied to business logic
- Component could be extracted to a library

**Examples**:
- ✅ `shared/logout-button.tsx` - Used in navbar, potentially elsewhere
- ✅ `shared/data-table.tsx` - Generic table component
- ✅ `shared/error-boundary.tsx` - Used app-wide
- ❌ `shared/bid-form.tsx` - Specific to bids feature
- ❌ `shared/auction-card.tsx` - Specific to auctions feature

**When to keep in feature**:
- Start with components in the feature directory
- Only promote to `shared/` when you have 3+ uses

### 4. Import Patterns

**Use barrel exports**:

```tsx
// ✅ Good
import { BidsView } from "@/features/bids";
import { LoginView, RegisterView } from "@/features/auth";

// ❌ Avoid
import { BidsView } from "@/features/bids/bids-view";
```

**Import order** (enforced by ESLint):

```tsx
// 1. External dependencies
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// 2. Internal modules (features, lib, shared)
import { LoginView } from "@/features/auth";
import { cn } from "@/lib/utils";

// 3. Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 4. Types
import type { Bid } from "./types";
```

### 5. Client vs Server Components

**Default to Server Components** in `app/` unless you need:
- State (`useState`, `useReducer`)
- Effects (`useEffect`)
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`localStorage`, `window`)
- Client-only hooks (`useRouter`, `useSearchParams`)

**Pattern**:

```tsx
// app/page.tsx - Server Component (no "use client")
import { DataView } from "@/features/data";

export default async function Page() {
  const data = await fetchData(); // Server-side
  return <DataView data={data} />;
}

// features/data/data-view.tsx - Client Component
"use client";

export function DataView({ data }) {
  const [filter, setFilter] = useState("");
  // ... interactive logic
}
```

## Adding a New Feature

Follow these steps when adding a new feature:

### 1. Create Feature Directory

```bash
mkdir -p frontend/features/[feature-name]/{components,hooks,lib}
```

### 2. Create Main View

```tsx
// features/[feature-name]/[feature-name]-view.tsx
"use client";

export function [FeatureName]View() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">[Feature Name]</h1>
    </div>
  );
}
```

### 3. Create Barrel Export

```ts
// features/[feature-name]/index.ts
export { [FeatureName]View } from "./[feature-name]-view";
```

### 4. Create App Page

```tsx
// app/[feature-name]/page.tsx
import { [FeatureName]View } from "@/features/[feature-name]";

export default async function [FeatureName]Page() {
  // Add data fetching if needed
  // const data = await getData();
  
  return <[FeatureName]View />;
}
```

### 5. Add Types (if needed)

```ts
// features/[feature-name]/types.ts
export interface [FeatureName] {
  id: string;
  // ... other fields
}
```

## Migration Checklist

When refactoring existing pages to this architecture:

- [ ] Create feature directory: `features/[feature-name]/`
- [ ] Extract UI logic into `[feature-name]-view.tsx`
- [ ] Add `"use client"` directive if component uses hooks/state
- [ ] Create `index.ts` barrel export
- [ ] Update `app/[feature-name]/page.tsx` to import and render view
- [ ] Move feature-specific components to `features/[feature-name]/components/`
- [ ] Move truly shared components to `components/shared/`
- [ ] Update imports across the codebase
- [ ] Test the feature thoroughly
- [ ] Delete old files

## Benefits of This Architecture

### 1. **Scalability**
- Easy to add new features without touching existing code
- Clear boundaries prevent feature creep
- Team members can work on different features with minimal conflicts

### 2. **Maintainability**
- Everything related to a feature is in one place
- Easy to find and update code
- Refactoring is isolated to feature directories

### 3. **Performance**
- Clear separation of Server and Client Components
- Minimal JavaScript shipped for RSC pages
- Tree-shaking works better with barrel exports

### 4. **Developer Experience**
- Intuitive structure - "I need to work on X? Go to `features/X/`"
- Less cognitive load - don't need to search multiple directories
- Easy onboarding for new developers

### 5. **Code Reusability**
- Shared components are explicit in `components/shared/`
- Easy to extract features to separate packages if needed
- Clear distinction between feature-specific and shared code

## Common Pitfalls to Avoid

### ❌ Don't: Mix Server and Client logic in one file

```tsx
// Bad
"use client";

export default async function Page() { // async + "use client" doesn't work
  const data = await fetch(...);
  return <div>{data}</div>;
}
```

### ✅ Do: Separate concerns

```tsx
// Good - app/page.tsx (Server)
export default async function Page() {
  const data = await fetch(...);
  return <View data={data} />;
}

// features/view.tsx (Client)
"use client";
export function View({ data }) {
  // interactive logic
}
```

### ❌ Don't: Create shared components prematurely

```tsx
// Bad - creating shared component for single use
// components/shared/auction-specific-card.tsx
```

### ✅ Do: Start in feature, promote when reused

```tsx
// Good - keep in feature first
// features/auctions/components/auction-card.tsx

// Later, if used in 3+ places, promote to shared
// components/shared/auction-card.tsx
```

### ❌ Don't: Create circular dependencies

```tsx
// Bad
// features/auctions/index.ts imports from features/bids/
// features/bids/index.ts imports from features/auctions/
```

### ✅ Do: Extract shared logic to lib or shared

```tsx
// Good
// lib/auction-utils.ts - shared utilities
// features/auctions/ imports from lib
// features/bids/ imports from lib
```

## Future Enhancements

As the application grows, consider:

1. **Feature flags**: Add `features/[feature]/config.ts` for feature toggles
2. **Feature tests**: Add `features/[feature]/__tests__/` for co-located tests
3. **Feature documentation**: Add `features/[feature]/README.md` for complex features
4. **Micro-frontends**: Features can be extracted to separate packages if needed

## Questions?

If you're unsure where something should go:

1. **Is it used in 3+ features?** → `components/shared/` or `lib/`
2. **Is it feature-specific?** → `features/[feature-name]/`
3. **Is it a UI component from shadcn?** → `components/ui/`
4. **Is it a server action?** → `actions/`
5. **Is it a shared type?** → `shared/types/`

When in doubt, start specific (in a feature) and refactor to shared later.

---

**Last Updated**: January 2026  
**Maintainer**: Development Team

