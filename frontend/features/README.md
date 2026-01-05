# Features Directory

This directory contains all feature modules for the Gavel frontend application.

## What is a Feature?

A **feature** is a self-contained module that represents a distinct area of functionality in the application. Each feature includes:

- Main view component (UI + logic)
- Feature-specific components
- Feature-specific hooks
- Feature-specific utilities
- Feature-specific types
- Barrel export (index.ts)

## Current Features

### 🔐 Auth (`features/auth/`)
Authentication-related UI components:
- `login-view.tsx` - Login form and logic
- `register-view.tsx` - Registration form and logic

**Used in:**
- `app/login/page.tsx`
- `app/register/page.tsx`

### 📊 Dashboard (`features/dashboard/`)
User dashboard view:
- `dashboard-view.tsx` - Dashboard overview

**Used in:**
- `app/dashboard/page.tsx`

### 🏛️ Auctions (`features/auctions/`)
Auctions listing and details:
- `auctions-view.tsx` - Auctions list view

**Used in:**
- `app/auctions/page.tsx`

## Creating a New Feature

Follow these steps to create a new feature:

### 1. Create Directory Structure

```bash
# Example: Creating a "bids" feature
mkdir -p features/bids/{components,hooks,lib}
```

Recommended structure:
```
features/bids/
├── components/          # Bid-specific components
│   ├── bid-form.tsx
│   ├── bid-history.tsx
│   └── bid-status.tsx
├── hooks/              # Bid-specific hooks
│   └── use-bid-submission.ts
├── lib/                # Bid-specific utilities
│   └── bid-utils.ts
├── bids-view.tsx       # Main view component (required)
├── types.ts            # Bid-specific types
└── index.ts            # Barrel export (required)
```

### 2. Create Main View Component

The view component is the main entry point for your feature:

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

**Key points:**
- ✅ Add `"use client"` if using hooks or interactivity
- ✅ Accept data as props from the RSC page
- ✅ Compose feature-specific components
- ❌ Don't fetch data directly (that's done in `app/`)

### 3. Create Barrel Export

```ts
// features/bids/index.ts
export { BidsView } from "./bids-view";
export type * from "./types";

// Optional: Export commonly used components
export { BidForm } from "./components/bid-form";
```

### 4. Create App Page (RSC)

```tsx
// app/bids/page.tsx
import { BidsView } from "@/features/bids";
import { getBids } from "@/actions/bids";

export default async function BidsPage() {
  const bids = await getBids();
  return <BidsView bids={bids} />;
}
```

### 5. Add Types (if needed)

```ts
// features/bids/types.ts
export interface Bid {
  id: string;
  amount: number;
  userId: string;
  auctionId: string;
  createdAt: Date;
}

export interface BidSubmission {
  auctionId: string;
  amount: number;
}
```

## Feature Guidelines

### ✅ DO

- **Keep features independent**: Avoid importing from other features
- **Use barrel exports**: Always export through `index.ts`
- **Co-locate related code**: Keep everything for a feature together
- **Start specific**: Begin with components in your feature
- **Use meaningful names**: `[feature]-view.tsx`, `use-[feature]-data.ts`

### ❌ DON'T

- **Don't create circular dependencies**: Features should not import from each other
- **Don't fetch data in views**: Let RSC pages handle data fetching
- **Don't create premature abstractions**: Start in feature, promote to shared later
- **Don't skip barrel exports**: Always use `index.ts`

## Sharing Code Between Features

### If code is used in multiple features:

1. **Shared utilities** → Move to `lib/`
2. **Shared components** → Move to `components/shared/`
3. **Shared types** → Move to `shared/types/`
4. **Shared API logic** → Move to `shared/api/`

### Rule of thumb:
- Used in **1 feature** → Keep in feature
- Used in **2 features** → Keep in feature, but watch
- Used in **3+ features** → Promote to shared

## Examples

### Small Feature (Dashboard)

```
features/dashboard/
├── dashboard-view.tsx
└── index.ts
```

Good for: Simple features with minimal logic

### Medium Feature (Auth)

```
features/auth/
├── login-view.tsx
├── register-view.tsx
└── index.ts
```

Good for: Related components without shared sub-components

### Large Feature (Auctions - future)

```
features/auctions/
├── components/
│   ├── auction-card.tsx
│   ├── auction-filters.tsx
│   └── auction-list.tsx
├── hooks/
│   ├── use-auction-filters.ts
│   └── use-auction-search.ts
├── lib/
│   ├── auction-utils.ts
│   └── auction-validators.ts
├── auctions-view.tsx
├── types.ts
└── index.ts
```

Good for: Complex features with many sub-components

## Import Patterns

### ✅ Good

```tsx
// Clean barrel imports
import { BidsView } from "@/features/bids";
import { LoginView, RegisterView } from "@/features/auth";

// Shared resources
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

### ❌ Bad

```tsx
// Deep imports bypass barrel exports
import { BidsView } from "@/features/bids/bids-view";

// Cross-feature imports create coupling
import { AuctionCard } from "@/features/auctions/components/auction-card";
```

## Testing

Co-locate tests with features:

```
features/bids/
├── __tests__/
│   ├── bids-view.test.tsx
│   └── components/
│       └── bid-form.test.tsx
├── components/
│   └── bid-form.tsx
└── bids-view.tsx
```

## Questions?

- 📖 **Architecture details**: See `../ARCHITECTURE.md`
- 📋 **Quick reference**: See `../QUICK-REFERENCE.md`
- 📝 **Refactoring history**: See `../REFACTORING-SUMMARY.md`

## Useful Commands

```bash
# Create new feature structure
./scripts/create-feature.sh [feature-name]  # (if script exists)

# Or manually:
mkdir -p features/[feature-name]/{components,hooks,lib}

# List all features
ls -la features/

# Find all view components
find features -name "*-view.tsx"
```

---

**Remember**: When in doubt, start specific (in your feature) and refactor to shared later!

