import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CreateItemForm } from "@/features/auctions/create-item-form/create-item-form";
import { createItemAction } from "@/actions/items";

export default async function CreateItemPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/auctions/new");
  }

  return <CreateItemForm createItemAction={createItemAction} />;
}
