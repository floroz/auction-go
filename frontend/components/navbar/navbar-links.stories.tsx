import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NavbarLinks } from "./navbar-links";

const meta = {
  title: "Components/Navbar/NavbarLinks",
  component: NavbarLinks,
  parameters: {
    layout: "padded",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/auctions",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="border-b bg-background p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavbarLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unauthenticated: Story = {
  args: {
    isAuthenticated: false,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/auctions",
      },
    },
  },
};

export const Authenticated: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/auctions",
      },
    },
  },
};

export const AuthenticatedOnSellPage: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/auctions/new",
      },
    },
  },
};

export const AuthenticatedOnDashboard: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/dashboard",
      },
    },
  },
};

export const AuthenticatedOnMyListings: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/dashboard/listings",
      },
    },
  },
};

export const AuthenticatedOnAuctionDetail: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/auctions/123",
      },
    },
  },
};
