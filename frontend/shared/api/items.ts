import { z } from "zod";
import type { Item as ProtoItem, ItemStatus } from "@/proto/bids/v1/bid_service_pb";

/**
 * Item Type (frontend-friendly version of proto Item)
 */
export type Item = {
  id: string;
  title: string;
  description: string;
  startPrice: number;
  currentHighestBid: number;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  category: string;
  sellerId: string;
  status: ItemStatus;
};

/**
 * Convert Proto Item to frontend Item type
 */
export function protoItemToItem(protoItem: ProtoItem): Item {
  return {
    id: protoItem.id,
    title: protoItem.title,
    description: protoItem.description,
    startPrice: Number(protoItem.startPrice),
    currentHighestBid: Number(protoItem.currentHighestBid),
    endAt: protoItem.endAt,
    createdAt: protoItem.createdAt,
    updatedAt: protoItem.updatedAt,
    images: protoItem.images,
    category: protoItem.category,
    sellerId: protoItem.sellerId,
    status: protoItem.status,
  };
}

/**
 * Create Item Input Schema
 */
export const createItemInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(5000, "Description too long"),
  startPrice: z.number().min(1, "Start price must be at least 1"),
  endAt: z.string().min(1, "End date is required"),
  images: z.array(z.string().url("Invalid image URL")),
  category: z.string(),
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

/**
 * Update Item Input Schema
 */
export const updateItemInputSchema = z.object({
  id: z.string().min(1, "Item ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long").optional(),
  description: z.string().max(5000, "Description too long").optional(),
  images: z.array(z.string().url("Invalid image URL")).optional(),
  category: z.string().optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

/**
 * Cancel Item Input Schema
 */
export const cancelItemInputSchema = z.object({
  id: z.string().min(1, "Item ID is required"),
});

export type CancelItemInput = z.infer<typeof cancelItemInputSchema>;
