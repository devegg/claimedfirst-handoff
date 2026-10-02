// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import PrivacyButton from "./PrivacyButton";

beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ data: null, error: null }); });
afterEach(cleanup);

describe("PrivacyButton", () => {
  it("edits a claim with set_claim_visibility", async () => {
    render(<PrivacyButton kind="claim" claimId="c1" artistName="Test Band" current="artist" />);
    fireEvent.click(screen.getByRole("button", { name: "Privacy" }));
    expect((screen.getByRole("radio", { name: "Artist only" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Anonymous" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choice" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_claim_visibility", { p_claim: "c1", p_visibility: "anonymous" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("edits a watch with set_watch_named", async () => {
    render(<PrivacyButton kind="watch" artistId="a1" artistName="Test Band" current="anonymous" />);
    fireEvent.click(screen.getByRole("button", { name: "Privacy" }));
    fireEvent.click(screen.getByRole("radio", { name: "Name visible to the artist" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choice" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_watch_named", { p_artist: "a1", p_named: true }));
  });

  it("shows an error and keeps the sheet open when saving fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not_your_claim" } });
    render(<PrivacyButton kind="claim" claimId="c1" artistName="X" current="public" />);
    fireEvent.click(screen.getByRole("button", { name: "Privacy" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choice" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Could not save. Try again.");
    expect(refresh).not.toHaveBeenCalled();
  });
});
