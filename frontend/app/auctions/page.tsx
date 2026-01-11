import { AuctionsView } from "@/features/auctions";
import { listItems } from "@/lib/items";
import { getCurrentUser } from "@/lib/auth";

export default async function AuctionsPage() {
   const { items } = await listItems({ pageSize: 50 });
  const currentUser = await getCurrentUser();

  return <AuctionsView items={items} currentUser={currentUser} />;
}
