import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listSellerItems } from "@/lib/items";
import { SellerListingsView } from "@/features/dashboard/seller-listings-view";
import { cancelItemAction } from "@/actions/items";

export default async function SellerListingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/dashboard/listings");
  }

  const { items } = await listSellerItems({ pageSize: 50 });

  return <SellerListingsView items={items}
    cancelItemAction={cancelItemAction}
  />;
}
