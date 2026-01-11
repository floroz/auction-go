import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Navbar } from "./navbar";
import type { ActionResult } from "@/shared/types";

// Mock logout action for Storybook
const mockLogoutAction = async (): Promise<ActionResult> => {
  console.log("Logout action triggered");
  return { success: true as const };
};

const meta = {
  title: "Components/Navbar/Navbar",
  component: Navbar,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/auctions",
      },
    },
  },
  args: {
    logoutAction: mockLogoutAction,
  },
} satisfies Meta<typeof Navbar>;

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
