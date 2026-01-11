"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Item } from "@/shared/api/items";
import type { cancelItemAction } from "@/actions/items";
import { ListingCard } from "../listing-card";

type SellerListingsViewProps = {
  items: Item[];
  cancelItemAction: typeof cancelItemAction;
};

export function SellerListingsView({ items, cancelItemAction }: SellerListingsViewProps) {
  const [isPending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();

  const handleCancelItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to cancel this auction? This action cannot be undone.")) {
      return;
    }

    setCancellingId(itemId);
    startTransition(async () => {
      const result = await cancelItemAction({ id: itemId });

      if (result.success) {
        toast.success("Auction cancelled successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setCancellingId(null);
    });
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your auction items
          </p>
        </div>
        <Button asChild>
          <Link href="/auctions/new">Create New Listing</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You haven&apos;t listed any items yet.</p>
          <Button asChild>
            <Link href="/auctions/new">Create Your First Listing</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              onCancel={handleCancelItem}
              isPending={isPending}
              cancellingId={cancellingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
