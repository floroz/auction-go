/**
 * Next.js Instrumentation Hook
 *
 * This file runs during server initialization (before any requests are handled).
 * We use it to:
 * - Load JWT public key into memory (fail-fast if misconfigured)
 * - Initialize other critical resources at startup
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeJWT } = await import("./lib/jwt");

    console.log("🔐 Initializing JWT verification...");
    await initializeJWT();
    console.log("✅ JWT verification initialized successfully");
  } else {
    console.log(
      "🔐 Skipping JWT verification - not running in Node.js runtime",
    );
  }
}
