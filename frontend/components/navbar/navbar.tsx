import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/shared/logout-button";
import { NavbarLinks } from "@/components/navbar/navbar-links";
import type { logoutAction } from "@/actions/auth";

type NavbarProps = {
  isAuthenticated: boolean;
  logoutAction: typeof logoutAction;
};

export function Navbar({ isAuthenticated, logoutAction }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">Gavel</span>
          </Link>
          <NavbarLinks isAuthenticated={isAuthenticated} />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search component could go here */}
          </div>
          <nav className="flex items-center space-x-2">
            {isAuthenticated ? (
              <LogoutButton logoutAction={logoutAction} />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
