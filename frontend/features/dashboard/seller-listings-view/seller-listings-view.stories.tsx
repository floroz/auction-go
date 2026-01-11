import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SellerListingsView } from "./seller-listings-view";
import type { CancelItemInput, Item } from "@/shared/api/items";
import { ActionResult } from "@/shared/types";
import { ItemStatus } from "@/proto/bids/v1/bid_service_pb";

const meta = {
  title: "Features/Dashboard/SellerListingsView",
  component: SellerListingsView,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SellerListingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockCancelItemAction = async (input: CancelItemInput) => ({
  success: true,
  data: {
    id: '123',
    title: "Mock Item",
    description: "This is a mock item for testing.",
    category: "Mock Category",
    startPrice: 1000,
    currentHighestBid: 0,
    sellerId: "seller-1",
    status: ItemStatus.CANCELLED,
    endAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}) satisfies ActionResult<Item>;

const mockItems: Item[] = [
  {
    id: "item-1",
    title: "Vintage Camera",
    description: "A beautiful vintage camera from the 1960s",
    category: "Electronics",
    startPrice: 5000,
    currentHighestBid: 7500,
    sellerId: "seller-1",
    status: ItemStatus.ACTIVE,
    endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=500"],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "item-2",
    title: "Classic Leather Watch",
    description: "Swiss-made leather watch",
    category: "Accessories",
    startPrice: 3000,
    currentHighestBid: 0,
    sellerId: "seller-1",
    status: ItemStatus.ACTIVE,
    endAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "item-3",
    title: "Antique Oil Painting",
    description: "19th century landscape painting",
    category: "Art",
    startPrice: 10000,
    currentHighestBid: 12000,
    sellerId: "seller-1",
    status: ItemStatus.ENDED,
    endAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1578926314433-a11be7c30c76?w=500"],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "item-4",
    title: "Collectible Vinyl Record",
    description: "First edition vinyl album",
    category: "Music",
    startPrice: 2000,
    currentHighestBid: 0,
    sellerId: "seller-1",
    status: ItemStatus.CANCELLED,
    endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    images: ["https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500"],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    items: mockItems,
    cancelItemAction: mockCancelItemAction,
  },
};

export const ActiveListingsOnly: Story = {
  args: {
    items: mockItems.filter((item) => item.status === ItemStatus.ACTIVE),
    cancelItemAction: mockCancelItemAction,
  },
};

export const WithBidsOnly: Story = {
  args: {
    items: mockItems.filter((item) => item.currentHighestBid > 0),
    cancelItemAction: mockCancelItemAction,
  },
};

export const NoBidsOnly: Story = {
  args: {
    items: mockItems.filter((item) => item.currentHighestBid === 0),
    cancelItemAction: mockCancelItemAction,
  },
};

export const EndedListings: Story = {
  args: {
    items: mockItems.filter((item) => item.status === ItemStatus.ENDED),
    cancelItemAction: mockCancelItemAction,
  },
};

export const CancelledListings: Story = {
  args: {
    items: mockItems.filter((item) => item.status === ItemStatus.CANCELLED),
    cancelItemAction: mockCancelItemAction,
  },
};

export const EmptyState: Story = {
  args: {
    items: [],
    cancelItemAction: mockCancelItemAction,
  },
};

export const SingleListing: Story = {
  args: {
    items: [mockItems[0]],
    cancelItemAction: mockCancelItemAction,
  },
};

export const ManyListings: Story = {
  args: {
    items: [
      ...mockItems,
      ...mockItems.map((item, idx) => ({
        ...item,
        id: `item-${idx + 5}`,
        title: `${item.title} - Copy ${idx + 1}`,
      })),
    ],
    cancelItemAction: mockCancelItemAction,
  },
};
