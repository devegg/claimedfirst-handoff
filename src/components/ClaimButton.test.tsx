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

import ClaimButton from "./ClaimButton";

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  maybeSingle.mockResolvedValue({ data: { default_claim_visibility: "artist", default_watch_named: false } });
  rpc.mockResolvedValue({ data: { claim_number: 7 }, error: null });
});
afterEach(cleanup);

describe("ClaimButton", () => {
  it("opens the sheet preselected to the scout default, then claims with the chosen level", async () => {
    render(<ClaimButton artistId="a1" artistName="Test Band" nextNumber={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim as #7" }));
    const dialog = await screen.findByRole("dialog", { name: /^Claim / });
    expect((screen.getByRole("radio", { name: "Artist only" }) as HTMLInputElement).checked).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Anonymous" }));
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("claim_artist", { p_artist: "a1", p_visibility: "anonymous" }));
    expect(await screen.findByText("You are Claim #7.")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
    expect(dialog.isConnected).toBe(false);
  });

  it("falls back to public when the profile cannot be read", async () => {
    maybeSingle.mockRejectedValue(new Error("boom"));
    render(<ClaimButton artistId="a1" artistName="Test Band" nextNumber={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim as #1" }));
    await screen.findByRole("dialog");
    expect((screen.getByRole("radio", { name: "Show my name" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("claim_artist", { p_artist: "a1", p_visibility: "public" }));
  });

  it("shows the mapped error inside the sheet", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "roster_full" } });
    render(<ClaimButton artistId="a1" artistName="Test Band" nextNumber={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim as #1" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Roster is full/);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to sign in without opening the sheet", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<ClaimButton artistId="a1" artistName="Test Band" nextNumber={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim as #1" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Sign in to claim/);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
