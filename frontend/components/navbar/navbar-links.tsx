"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/classnames";

type NavbarLinksProps = {
  isAuthenticated: boolean;
};

export function NavbarLinks({ isAuthenticated }: NavbarLinksProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/auctions") {
      return pathname === path || pathname?.startsWith("/auctions/");
    }
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <nav className="flex items-center space-x-6 text-sm font-medium">
      <Link
        href="/auctions"
        className={cn(
          "transition-colors hover:text-foreground/80",
          isActive("/auctions") ? "text-foreground" : "text-foreground/60"
        )}
      >
        Auctions
      </Link>
      {isAuthenticated && (
        <>
          <Link
            href="/auctions/new"
            className={cn(
              "transition-colors hover:text-foreground/80",
              isActive("/auctions/new") ? "text-foreground" : "text-foreground/60"
            )}
          >
            Sell
          </Link>
          <Link
            href="/dashboard/listings"
            className={cn(
              "transition-colors hover:text-foreground/80",
              isActive("/dashboard/listings") ? "text-foreground" : "text-foreground/60"
            )}
          >
            My Listings
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Dashboard
          </Link>
        </>
      )}
    </nav>
  );
}
