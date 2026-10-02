// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import SettingsForm from "./SettingsForm";

beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ data: 3, error: null }); });
afterEach(cleanup);

const form = (over = {}) =>
  render(<SettingsForm initialClaim="public" initialWatch="anonymous" claimCount={3} watchCount={1} {...over} />);

describe("SettingsForm", () => {
  it("saves defaults with set_default_visibility", async () => {
    form();
    const defaults = screen.getByRole("group", { name: "Default for new claims" });
    expect((defaults.querySelector("input:checked") as HTMLInputElement).value).toBe("public");
    fireEvent.click(screen.getByRole("radio", { name: "Artist only" }));
    fireEvent.click(screen.getByRole("radio", { name: "Name visible to the artist" }));
    fireEvent.click(screen.getByRole("button", { name: "Save defaults" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_default_visibility", { p_claim: "artist", p_watch: true }));
    expect((await screen.findByRole("status")).textContent).toMatch(/Defaults saved/);
  });

  it("bulk-sets claims only after a confirmation that states the count", async () => {
    form();
    fireEvent.change(screen.getByLabelText("Set all my existing claims to"), { target: { value: "anonymous" } });
    fireEvent.click(screen.getByRole("button", { name: "Review change to claims" }));
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByText(/This will change 3 claims to Anonymous/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm change to claims" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_all_claim_visibility", { p_visibility: "anonymous" }));
    expect((await screen.findByText(/3 claims set to Anonymous/))).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("bulk-sets watches with set_all_watch_named", async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    form();
    fireEvent.change(screen.getByLabelText("Set all my existing watches to"), { target: { value: "named" } });
    fireEvent.click(screen.getByRole("button", { name: "Review change to watches" }));
    expect(screen.getByText(/This will change 1 watch to Name visible to the artist/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm change to watches" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_all_watch_named", { p_named: true }));
  });

  it("can cancel a bulk change", () => {
    form();
    fireEvent.click(screen.getByRole("button", { name: "Review change to claims" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.queryByRole("button", { name: "Confirm change to claims" })).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("states the existing-items-only rule and shows errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    form({ claimCount: null });
    const t = document.body.textContent ?? "";
    expect(t).toMatch(/apply to claims and watches you make from now on/i);
    expect(t).toMatch(/change every claim or watch you already have/i);
    expect(t.indexOf("For new claims and watches")).toBeLessThan(t.indexOf("Change existing claims and watches"));
    expect(screen.getByRole("heading", { name: "For new claims and watches" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Change existing claims and watches" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save defaults" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Could not save. Try again.");
    expect(document.body.textContent).not.toContain("!");
  });
});
