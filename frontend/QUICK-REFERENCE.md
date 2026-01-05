# Quick Reference: Feature-Based Architecture

## 📁 Directory Structure at a Glance

```
frontend/
│
├── 📱 app/                          # MINIMAL RSC ONLY
│   ├── login/page.tsx               # → <LoginView />
│   ├── register/page.tsx            # → <RegisterView />
│   ├── dashboard/page.tsx           # → <DashboardView />
│   └── auctions/page.tsx            # → <AuctionsView />
│
├── 🎨 features/                     # FEATURE MODULES
│   ├── auth/                        # 🔐 Authentication
│   │   ├── login-view.tsx           # Login UI + logic
│   │   ├── register-view.tsx        # Register UI + logic
│   │   └── index.ts                 # Export: { LoginView, RegisterView }
│   │
│   ├── dashboard/                   # 📊 Dashboard
│   │   ├── dashboard-view.tsx       # Dashboard UI + logic
│   │   └── index.ts                 # Export: { DashboardView }
│   │
│   ├── auctions/                    # 🏛️ Auctions
│   │   ├── auctions-view.tsx        # Auctions UI + logic
│   │   └── index.ts                 # Export: { AuctionsView }
│   │
│   └── bids/ (coming soon)          # 💰 Bidding
│       ├── components/
│       │   ├── bid-form.tsx
│       │   ├── bid-history.tsx
│       │   └── bid-status.tsx
│       ├── hooks/
│       │   └── use-bid-submission.ts
│       ├── bids-view.tsx
│       ├── types.ts
│       └── index.ts
│
├── 🧩 components/
│   ├── ui/                          # shadcn components
│   └── shared/                      # Reusable across features
│       ├── logout-button.tsx
│       └── navbar.tsx
│
├── ⚡ actions/                      # Server Actions
│   ├── auth.ts
│   └── bids.ts
│
├── 🛠️ lib/                         # Utilities
│   ├── api/
│   ├── auth.ts
│   └── utils.ts
│
└── 📦 shared/                       # Shared Types & API
    ├── api/
    └── types/
```

---

## 🎯 When to Put Code Where?

### ❓ Where does my code go?

```
┌─────────────────────────────────────────────────┐
│  Is it a page route?                            │
│  → app/[route]/page.tsx (minimal RSC wrapper)   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Is it UI for a specific feature?               │
│  → features/[feature]/[feature]-view.tsx        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Is it used in 3+ features?                     │
│  YES → components/shared/                       │
│  NO  → features/[feature]/components/           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Is it a shadcn UI component?                   │
│  → components/ui/                               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Is it a server action?                         │
│  → actions/[action-name].ts                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Is it a shared utility?                        │
│  → lib/[util-name].ts                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Is it a shared type?                           │
│  → shared/types/[type-name].ts                  │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Examples

### ✅ Adding a New "Bids" Feature

```bash
# 1. Create structure
mkdir -p features/bids/{components,hooks}

# 2. Create view
cat > features/bids/bids-view.tsx << EOF
"use client";
export function BidsView({ bids }) {
  return <div>My Bids</div>;
}
EOF

# 3. Create barrel export
cat > features/bids/index.ts << EOF
export { BidsView } from "./bids-view";
EOF

# 4. Create page
cat > app/bids/page.tsx << EOF
import { BidsView } from "@/features/bids";
export default async function BidsPage() {
  const bids = await getBids();
  return <BidsView bids={bids} />;
}
EOF
```

### ✅ App Page Pattern (Server Component)

```tsx
// app/bids/page.tsx
import { BidsView } from "@/features/bids";
import { getBids } from "@/actions/bids";

export default async function BidsPage() {
  const data = await getBids();     // Server-side data fetch
  return <BidsView bids={data} />;  // Pass to client component
}
```

### ✅ Feature View Pattern (Client Component)

```tsx
// features/bids/bids-view.tsx
"use client";

import { useState } from "react";
import { BidForm } from "./components/bid-form";

export function BidsView({ bids }) {
  const [filter, setFilter] = useState("");
  // ... interactive logic
  return (
    <div>
      <BidForm />
      {/* ... */}
    </div>
  );
}
```

---

## 📋 Cheat Sheet

| Need | Location | Example |
|------|----------|---------|
| Route | `app/[route]/page.tsx` | `app/bids/page.tsx` |
| Feature UI | `features/[feature]/[feature]-view.tsx` | `features/bids/bids-view.tsx` |
| Feature Component | `features/[feature]/components/` | `features/bids/components/bid-form.tsx` |
| Feature Hook | `features/[feature]/hooks/` | `features/bids/hooks/use-bid-submission.ts` |
| Shared Component | `components/shared/` | `components/shared/data-table.tsx` |
| UI Component | `components/ui/` | `components/ui/button.tsx` |
| Server Action | `actions/` | `actions/bids.ts` |
| Utility | `lib/` | `lib/format-currency.ts` |
| Type | `shared/types/` | `shared/types/bid.ts` |

---

## 🎓 Key Rules

1. **app/ = Minimal**: Only data fetching + view rendering
2. **features/ = Self-contained**: Everything for a feature together
3. **"use client"**: In feature views, not in app pages
4. **3+ rule**: Move to shared only when used in 3+ features
5. **Barrel exports**: Always use `index.ts` in features

---

## 🔍 Import Examples

```tsx
// ✅ Good - Clean barrel imports
import { BidsView } from "@/features/bids";
import { LoginView, RegisterView } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/shared/logout-button";

// ❌ Bad - Deep imports
import { BidsView } from "@/features/bids/bids-view";
import { Button } from "@/components/ui/button.tsx";
```

---

## 📚 Full Documentation

- **Detailed Guide**: See `ARCHITECTURE.md`
- **Refactor Summary**: See `REFACTORING-SUMMARY.md`

---

**Last Updated**: January 2026

