// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    rpc,
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import WatchButton from "./WatchButton";

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  maybeSingle.mockResolvedValue({ data: { default_claim_visibility: "public", default_watch_named: true } });
  rpc.mockResolvedValue({ data: {}, error: null });
});
afterEach(cleanup);

describe("WatchButton", () => {
  it("watches with the chosen level, preselecting the default", async () => {
    render(<WatchButton artistId="a1" artistName="Test Band" initialNamed={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Watch" }));
    await screen.findByRole("dialog", { name: "Watch Test Band" });
    expect((screen.getByRole("radio", { name: "Name visible to the artist" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Anonymous" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Watch" })[1]);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("watch_artist", { p_artist: "a1", p_named: false }));
    expect(await screen.findByText("Watching")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("maps watchlist_full", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "watchlist_full" } });
    render(<WatchButton artistId="a1" artistName="X" initialNamed={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Watch" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getAllByRole("button", { name: "Watch" })[1]);
    expect((await screen.findByRole("alert")).textContent).toBe("Your watchlist is full (100 artists). Remove one to add another.");
  });

  it("when already watching, changes privacy with set_watch_named", async () => {
    render(<WatchButton artistId="a1" artistName="X" initialNamed={false} />);
    expect(screen.getByText("Watching")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Watch" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change privacy" }));
    await screen.findByRole("dialog");
    expect((screen.getByRole("radio", { name: "Anonymous" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Name visible to the artist" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choice" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_watch_named", { p_artist: "a1", p_named: true }));
    expect(refresh).toHaveBeenCalled();
  });

  it("stops watching with unwatch_artist", async () => {
    render(<WatchButton artistId="a1" artistName="X" initialNamed={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop watching" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("unwatch_artist", { p_artist: "a1" }));
    expect(await screen.findByRole("button", { name: "Watch" })).toBeTruthy();
  });

  it("points a signed-out visitor to sign in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<WatchButton artistId="a1" artistName="X" initialNamed={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Watch" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Sign in to watch/);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(rpc).not.toHaveBeenCalled();
  });
});
