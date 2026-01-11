import { notFound } from "next/navigation";
import { getItem, getItemBids } from "@/lib/items";
import { getCurrentUser } from "@/lib/auth";
import { ItemDetailView } from "@/features/auctions/item-detail-view";
import { placeBidAction } from "@/actions/bids";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getItem(id);

  if (!item) {
    notFound();
  }

  const { bids } = await getItemBids({ itemId: id, pageSize: 20 });
  const currentUser = await getCurrentUser();

  return (
    <ItemDetailView
      item={item}
      bids={bids}
      isAuthenticated={!!currentUser}
      currentUserId={currentUser?.userId}
      placeBidAction={placeBidAction}
    />
  );
}
