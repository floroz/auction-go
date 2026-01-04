import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getSession, requireAuth, getCurrentUser } from "./auth";
import { redirect } from "next/navigation";
import { authClient } from "./rpc";
import { getAuthCookies, setAuthCookies, clearAuthCookies } from "./cookies";

// Mocks
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((key) => {
      if (key === "x-forwarded-for") return "127.0.0.1";
      if (key === "user-agent") return "test-agent";
      return null;
    }),
  }),
}));

vi.mock("./rpc", () => ({
  authClient: {
    refresh: vi.fn(),
  },
}));

vi.mock("./cookies", () => ({
  getAuthCookies: vi.fn(),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
}));

const getAuthCookiesMock = getAuthCookies as Mock;
const setAuthCookiesMock = setAuthCookies as Mock;
const clearAuthCookiesMock = clearAuthCookies as Mock;
const authClientRefreshMock = authClient.refresh as Mock;

describe("auth utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSession", () => {
    it("should return null if no tokens exist", async () => {
      getAuthCookiesMock.mockResolvedValue({
        accessToken: undefined,
        refreshToken: undefined,
      });

      const session = await getSession();

      expect(session).toBeNull();
      expect(getAuthCookies).toHaveBeenCalled();
    });

    it("should return session with access token if access token exists", async () => {
      const mockAccessToken = "valid-access-token";
      getAuthCookiesMock.mockResolvedValue({
        accessToken: mockAccessToken,
        refreshToken: "some-refresh-token",
      });

      const session = await getSession();

      expect(session).toEqual({ accessToken: mockAccessToken });
      expect(authClient.refresh).not.toHaveBeenCalled();
    });

    it("should refresh token if access token is missing but refresh token exists", async () => {
      const mockRefreshToken = "valid-refresh-token";
      const newAccessToken = "new-access-token";
      const newRefreshToken = "new-refresh-token";

      getAuthCookiesMock.mockResolvedValue({
        accessToken: undefined,
        refreshToken: mockRefreshToken,
      });

      authClientRefreshMock.mockResolvedValue({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      const session = await getSession();

      expect(authClientRefreshMock).toHaveBeenCalledWith({
        refreshToken: mockRefreshToken,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      });
      expect(setAuthCookiesMock).toHaveBeenCalledWith(
        newAccessToken,
        newRefreshToken,
      );
      expect(session).toEqual({ accessToken: newAccessToken });
    });

    it("should clear cookies and return null if refresh fails", async () => {
      const mockRefreshToken = "invalid-refresh-token";
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      getAuthCookiesMock.mockResolvedValue({
        accessToken: undefined,
        refreshToken: mockRefreshToken,
      });

      authClientRefreshMock.mockRejectedValue(new Error("Refresh failed"));

      const session = await getSession();

      expect(authClientRefreshMock).toHaveBeenCalledWith({
        refreshToken: mockRefreshToken,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      });
      expect(clearAuthCookiesMock).toHaveBeenCalled();
      expect(session).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("requireAuth", () => {
    it("should return session if user is authenticated", async () => {
      const mockAccessToken = "valid-token";
      getAuthCookiesMock.mockResolvedValue({
        accessToken: mockAccessToken,
      });

      const session = await requireAuth();

      expect(session).toEqual({ accessToken: mockAccessToken });
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to /login if user is not authenticated", async () => {
      getAuthCookiesMock.mockResolvedValue({
        accessToken: undefined,
        refreshToken: undefined,
      });

      await requireAuth();

      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("getCurrentUser", () => {
    it("should return user info if session exists", async () => {
      const mockAccessToken = "valid-token";
      getAuthCookiesMock.mockResolvedValue({
        accessToken: mockAccessToken,
      });

      const user = await getCurrentUser();

      expect(user).toEqual({ accessToken: mockAccessToken });
    });

    it("should return null if session does not exist", async () => {
      getAuthCookiesMock.mockResolvedValue({
        accessToken: undefined,
        refreshToken: undefined,
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
