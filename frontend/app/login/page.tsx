"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginView } from "@/features/auth";

/**
 * Validate redirect URL to prevent open redirect attacks
 * Only allows relative paths starting with /
 */
function isValidRedirect(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo =
    redirectParam && isValidRedirect(redirectParam)
      ? redirectParam
      : "/dashboard";

  return <LoginView redirectTo={redirectTo} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] bg-muted/40 p-4">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
