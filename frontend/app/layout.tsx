import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar/navbar";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gavel - Online Auction Platform",
  description:
    "Gavel is the premier online auction platform for buying and selling unique items.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans text-foreground`}
      >
        <div className="relative flex min-h-screen flex-col">
          <Navbar isAuthenticated={!!session} logoutAction={logoutAction} />
          <div className="flex-1">{children}</div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
