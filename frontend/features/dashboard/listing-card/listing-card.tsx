"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Item } from "@/shared/api/items";
import { ItemStatus } from "@/proto/bids/v1/bid_service_pb";
import { formatTimeRemainingCompact } from "@/lib/date";

type ListingCardProps = {
  item: Item;
  onCancel: (itemId: string) => void;
  isPending: boolean;
  cancellingId: string | null;
};

export function ListingCard({ item, onCancel, isPending, cancellingId }: ListingCardProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusBadge = () => {
    const endDate = new Date(item.endAt);
    const isEnded = endDate < new Date();

    if (item.status === ItemStatus.CANCELLED) {
      return <span className="text-xs text-destructive font-medium">Cancelled</span>;
    }
    if (item.status === ItemStatus.ENDED || isEnded) {
      return <span className="text-xs text-muted-foreground font-medium">Ended</span>;
    }
    return <span className="text-xs text-green-600 font-medium">Active</span>;
  };

  const canCancel = () => {
    return item.status === ItemStatus.ACTIVE && item.currentHighestBid === 0;
  };

  return (
    <Card>
      <Link href={`/auctions/${item.id}`}>
        {item.images.length > 0 ? (
          <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
            <img
              src={item.images[0]}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
      </Link>

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/auctions/${item.id}`} className="flex-1 min-w-0">
            <CardTitle className="line-clamp-1 hover:underline text-lg">
              {item.title}
            </CardTitle>
          </Link>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Starting price</span>
          <span className="font-medium">{formatPrice(item.startPrice)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Current bid</span>
          <span className="font-semibold">
            {item.currentHighestBid > 0
              ? formatPrice(item.currentHighestBid)
              : "No bids"}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Time left</span>
          <span className="text-xs font-medium">{formatTimeRemainingCompact(item.endAt, item.status === ItemStatus.ACTIVE)}</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/auctions/${item.id}`}>View</Link>
        </Button>
        {canCancel() && (
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onCancel(item.id)}
            disabled={isPending && cancellingId === item.id}
          >
            {isPending && cancellingId === item.id ? "Cancelling..." : "Cancel"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
