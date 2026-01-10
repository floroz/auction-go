/**
 * Item Data Fetching Functions (RSC)
 *
 * These functions are used in React Server Components to fetch item data
 * from the bid service. They use the bidClient from lib/rpc.
 */

import { bidClient } from "@/lib/rpc";
import { protoItemToItem, type Item } from "@/shared/api/items";
import { getSession } from "@/lib/auth";

/**
 * Get a single item by ID
 * Public endpoint - no auth required
 */
export async function getItem(id: string): Promise<Item | null> {
  try {
    const response = await bidClient.getItem({ id });

    if (!response.item) {
      return null;
    }

    return protoItemToItem(response.item);
  } catch (error) {
    console.error("Failed to fetch item:", error);
    return null;
  }
}

/**
 * List Items Options
 */
export type ListItemsOptions = {
  pageSize?: number;
  pageToken?: string;
  category?: string;
};

/**
 * List Items Result
 */
export type ListItemsResult = {
  items: Item[];
  nextPageToken: string;
};

/**
 * List active items with pagination
 * Public endpoint - no auth required
 */
export async function listItems(
  options: ListItemsOptions = {},
): Promise<ListItemsResult> {
  try {
    const response = await bidClient.listItems({
      pageSize: options.pageSize || 20,
      pageToken: options.pageToken || "",
      category: options.category || "",
    });

    return {
      items: response.items.map(protoItemToItem),
      nextPageToken: response.nextPageToken,
    };
  } catch (error) {
    console.error("Failed to fetch items:", error);
    return {
      items: [],
      nextPageToken: "",
    };
  }
}

/**
 * List Seller Items Options
 */
export type ListSellerItemsOptions = {
  pageSize?: number;
  pageToken?: string;
};

/**
 * List items for the authenticated seller
 * Requires authentication
 */
export async function listSellerItems(
  options: ListSellerItemsOptions = {},
): Promise<ListItemsResult> {
  const session = await getSession();

  if (!session) {
    return {
      items: [],
      nextPageToken: "",
    };
  }

  try {
    const response = await bidClient.listSellerItems(
      {
        pageSize: options.pageSize || 20,
        pageToken: options.pageToken || "",
      },
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    return {
      items: response.items.map(protoItemToItem),
      nextPageToken: response.nextPageToken,
    };
  } catch (error) {
    console.error("Failed to fetch seller items:", error);
    return {
      items: [],
      nextPageToken: "",
    };
  }
}

/**
 * Get Item Bids Options
 */
export type GetItemBidsOptions = {
  itemId: string;
  pageSize?: number;
  pageToken?: string;
};

/**
 * Bid type (frontend-friendly)
 */
export type Bid = {
  id: string;
  itemId: string;
  userId: string;
  amount: number;
  createdAt: string;
};

/**
 * Get Item Bids Result
 */
export type GetItemBidsResult = {
  bids: Bid[];
  nextPageToken: string;
};

/**
 * Get bids for a specific item
 * Public endpoint - no auth required
 */
export async function getItemBids(
  options: GetItemBidsOptions,
): Promise<GetItemBidsResult> {
  try {
    const response = await bidClient.getItemBids({
      itemId: options.itemId,
      pageSize: options.pageSize || 10,
      pageToken: options.pageToken || "",
    });

    return {
      bids: response.bids.map((bid) => ({
        id: bid.id,
        itemId: bid.itemId,
        userId: bid.userId,
        amount: Number(bid.amount),
        createdAt: bid.createdAt,
      })),
      nextPageToken: response.nextPageToken,
    };
  } catch (error) {
    console.error("Failed to fetch item bids:", error);
    return {
      bids: [],
      nextPageToken: "",
    };
  }
}
