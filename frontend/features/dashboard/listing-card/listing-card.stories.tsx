import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListingCard } from "./listing-card";
import { ItemStatus } from "@/proto/bids/v1/bid_service_pb";
import type { Item } from "@/shared/api/items";

const meta = {
  title: "Features/Dashboard/ListingCard",
  component: ListingCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
  args: {
    onCancel: async (itemId: string) => {
      console.log("Cancel item:", itemId);
    },
    isPending: false,
    cancellingId: null,
  },
} satisfies Meta<typeof ListingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseItem: Item = {
  id: "item-1",
  title: "Vintage Camera",
  description: "A beautiful vintage camera from the 1960s in excellent condition.",
  category: "Electronics",
  startPrice: 5000,
  currentHighestBid: 7500,
  sellerId: "seller-1",
  status: ItemStatus.ACTIVE,
  endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  images: ["https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=500"],
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

export const ActiveWithBids: Story = {
  args: {
    item: baseItem,
  },
};

export const ActiveNoBids: Story = {
  args: {
    item: {
      ...baseItem,
      currentHighestBid: 0,
    },
  },
};

export const Cancelling: Story = {
  args: {
    item: {
      ...baseItem,
      currentHighestBid: 0,
    },
    isPending: true,
    cancellingId: "item-1",
  },
};

export const EndedWithBids: Story = {
  args: {
    item: {
      ...baseItem,
      status: ItemStatus.ENDED,
      endAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  },
};

export const EndedNoBids: Story = {
  args: {
    item: {
      ...baseItem,
      status: ItemStatus.ENDED,
      currentHighestBid: 0,
      endAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  },
};

export const Cancelled: Story = {
  args: {
    item: {
      ...baseItem,
      status: ItemStatus.CANCELLED,
      currentHighestBid: 0,
    },
  },
};

export const NoImage: Story = {
  args: {
    item: {
      ...baseItem,
      images: [],
    },
  },
};

export const LongTitle: Story = {
  args: {
    item: {
      ...baseItem,
      title: "Extremely Rare and Valuable Vintage Camera from the Early 1960s",
    },
  },
};

export const HighPrice: Story = {
  args: {
    item: {
      ...baseItem,
      startPrice: 125000,
      currentHighestBid: 250000,
    },
  },
};
