// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const refresh = vi.fn();
const push = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

import TopSongsEditor from "./TopSongsEditor";
import DonationEditor from "./DonationEditor";
import AudiencePanel from "./AudiencePanel";
import PageControls from "./PageControls";
import ReportButton from "./ReportButton";

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: null, error: null });
});
afterEach(cleanup);

const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const box = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;

describe("TopSongsEditor", () => {
  it("saves the exact payload in row order, skipping empty rows", async () => {
    render(<TopSongsEditor artistId="a1" initial={[{ title: "One", url: "https://example.com/1" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add song" }));
    fireEvent.click(screen.getByRole("button", { name: "Add song" }));
    fireEvent.change(box("Song title 3"), { target: { value: "  Three " } });
    fireEvent.change(box("Song link 3"), { target: { value: "https://example.com/3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save songs" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_top_songs", {
      p_artist: "a1",
      p_songs: [{ title: "One", url: "https://example.com/1" }, { title: "Three", url: "https://example.com/3" }],
    }));
    expect((await screen.findByRole("status")).textContent).toContain("Saved");
    expect(refresh).toHaveBeenCalled();
  });

  it("adds up to 10 rows and blocks the 11th", () => {
    render(<TopSongsEditor artistId="a1" initial={[]} />);
    for (let i = 0; i < 12; i++) {
      const add = screen.getByRole("button", { name: "Add song" }) as HTMLButtonElement;
      if (!add.disabled) fireEvent.click(add);
    }
    expect(screen.getAllByRole("textbox", { name: /^Song title \d+$/ })).toHaveLength(10);
    expect((screen.getByRole("button", { name: "Add song" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a per-row error and does not save", () => {
    render(<TopSongsEditor artistId="a1" initial={[{ title: "One", url: "https://example.com/1" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add song" }));
    fireEvent.change(box("Song title 2"), { target: { value: "Two" } });
    fireEvent.change(box("Song link 2"), { target: { value: "http://example.com/2" } });
    expect(box("Song link 2").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Use a full https:// link to a public website.")).toBeTruthy();
    expect(box("Song link 1").getAttribute("aria-invalid")).not.toBe("true");
    expect((screen.getByRole("button", { name: "Save songs" }) as HTMLButtonElement).disabled).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("removes a row", () => {
    render(<TopSongsEditor artistId="a1" initial={[{ title: "One", url: "https://example.com/1" }, { title: "Two", url: "https://example.com/2" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove song 1" }));
    expect(box("Song title 1").value).toBe("Two");
  });

  it("maps a database error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not_owner" } });
    render(<TopSongsEditor artistId="a1" initial={[{ title: "One", url: "https://example.com/1" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Save songs" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Only the verified owner of this page can do that.");
  });
});

describe("DonationEditor", () => {
  it("saves a trimmed https link", async () => {
    render(<DonationEditor artistId="a1" initial={null} />);
    type("Support link", " https://example.com/tip ");
    fireEvent.click(screen.getByRole("button", { name: "Save support link" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_donation_url", { p_artist: "a1", p_url: "https://example.com/tip" }));
  });
  it("clears with null when blank", async () => {
    render(<DonationEditor artistId="a1" initial="https://example.com/tip" />);
    type("Support link", "");
    fireEvent.click(screen.getByRole("button", { name: "Save support link" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_donation_url", { p_artist: "a1", p_url: null }));
  });
  it("blocks an invalid link", () => {
    render(<DonationEditor artistId="a1" initial={null} />);
    type("Support link", "http://example.com");
    expect(screen.getByText("Use a full https:// link to a public website.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save support link" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("AudiencePanel", () => {
  const rows = [
    { kind: "claimer", handle: "test_1", claim_number: 1, status: "active", since: "2026-09-01T10:00:00Z" },
    { kind: "claimer", handle: "Anonymous scout", claim_number: 2, status: "historical", since: "2026-09-02T00:00:00Z" },
    { kind: "watcher", handle: "test_3", claim_number: null, status: null, since: "2026-09-03T10:00:00Z" },
  ] as const;
  it("shows claimers by default with masked names and counts on the tabs", () => {
    render(<AudiencePanel rows={[...rows]} counts={{ total: 5, named: 1 }} />);
    expect(screen.getByRole("tab", { name: "Claimed · 2" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Watching · 5" })).toBeTruthy();
    expect(screen.getByText("test_1")).toBeTruthy();
    expect(screen.getByText("Anonymous scout")).toBeTruthy();
    expect(screen.getByText("Historical")).toBeTruthy();
    expect(screen.queryByText("test_3")).toBeNull();
    expect(screen.getByText("Each scout chooses who sees their name. Anonymous scouts still count, but you will never see who they are.")).toBeTruthy();
  });
  it("shows named watchers and the anonymous split on the Watching tab", () => {
    render(<AudiencePanel rows={[...rows]} counts={{ total: 5, named: 1 }} />);
    fireEvent.click(screen.getByRole("tab", { name: "Watching · 5" }));
    expect(screen.getByText("test_3")).toBeTruthy();
    expect(screen.getByText("5 watching: 1 named, 4 anonymous")).toBeTruthy();
    expect(screen.queryByText("Anonymous scout")).toBeNull();
  });
  it("handles empty lists", () => {
    render(<AudiencePanel rows={[]} counts={{ total: 0, named: 0 }} />);
    expect(screen.getByText("No claims yet.")).toBeTruthy();
  });
});

describe("PageControls", () => {
  it("freezes keeping delist as read", async () => {
    render(<PageControls artistId="a1" artistName="Test Band" claimsFrozen={false} delisted={false} />);
    fireEvent.click(screen.getByRole("switch", { name: "Freeze new claims" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_artist_state", { p_artist: "a1", p_freeze: true, p_delist: false }));
    expect(refresh).toHaveBeenCalled();
  });
  it("unfreezes", async () => {
    render(<PageControls artistId="a1" artistName="Test Band" claimsFrozen={true} delisted={false} />);
    const sw = screen.getByRole("switch", { name: "Freeze new claims" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_artist_state", { p_artist: "a1", p_freeze: false, p_delist: false }));
  });
  it("removes only after confirming, keeping the freeze flag", async () => {
    render(<PageControls artistId="a1" artistName="Test Band" claimsFrozen={true} delisted={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove my page" }));
    const dlg = screen.getByRole("dialog", { name: "Remove your page?" });
    expect(within(dlg).getByText(/keep their claim numbers as history/)).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
    fireEvent.click(within(dlg).getByRole("button", { name: "Remove page" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_artist_state", { p_artist: "a1", p_freeze: true, p_delist: true }));
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
  it("cancel leaves the page alone", () => {
    render(<PageControls artistId="a1" artistName="Test Band" claimsFrozen={false} delisted={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove my page" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("ReportButton", () => {
  function open() {
    render(<ReportButton artistId="a1" />);
    fireEvent.click(screen.getByRole("button", { name: "Report this page" }));
  }
  it("rejects an empty reason", () => {
    open();
    const dlg = screen.getByRole("dialog", { name: "Report this page" });
    fireEvent.change(within(dlg).getByLabelText("Reason"), { target: { value: "   " } });
    fireEvent.click(within(dlg).getByRole("button", { name: "Send report" }));
    expect(screen.getByRole("alert").textContent).toBe("Write a reason of 1 to 500 characters.");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects a reason over 500 characters", () => {
    open();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "x".repeat(501) } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(rpc).not.toHaveBeenCalled();
  });
  it("sends the trimmed reason and thanks the scout", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "  Not the real artist " } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("report_artist", { p_artist: "a1", p_reason: "Not the real artist" }));
    expect(await screen.findByText("Thanks. We have recorded your report.")).toBeTruthy();
  });
  it("shows the daily limit message when the database refuses a sixth report", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "report_limit_reached" } });
    open();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Not the real artist" } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect((await screen.findByRole("alert")).textContent).toBe("You have reached the limit of 5 reports in a day. Please try again tomorrow.");
  });
  it("compact mode is a small Report button that still names the page", () => {
    render(<ReportButton artistId="p1" artistName="Pending Band" compact />);
    const b = screen.getByRole("button", { name: "Report Pending Band" });
    expect(b.textContent).toBe("Report");
    fireEvent.click(b);
    expect(screen.getByRole("dialog", { name: "Report this page" })).toBeTruthy();
  });
  it("closes with Escape", () => {
    open();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

import RemovedBanner from "./RemovedBanner";
import { canOfferVerify } from "@/lib/verify-link";

describe("RemovedBanner", () => {
  it("explains the page is removed and restores with delist=false, keeping the freeze value", async () => {
    render(<RemovedBanner artistId="a1" artistName="Test Band" claimsFrozen={true} />);
    expect(screen.getByText("Your page is removed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bring my page back" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_artist_state", { p_artist: "a1", p_freeze: true, p_delist: false }));
    expect(refresh).toHaveBeenCalled();
  });
  it("shows a plain error when restoring fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not_owner" } });
    render(<RemovedBanner artistId="a1" artistName="Test Band" claimsFrozen={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Bring my page back" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Only the verified owner of this page can do that.");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("canOfferVerify", () => {
  it("is for signed-in scouts on unverified pages only", () => {
    expect(canOfferVerify(true, null)).toBe(true);
    expect(canOfferVerify(true, "2026-01-01T00:00:00Z")).toBe(false);
    expect(canOfferVerify(false, null)).toBe(false);
  });
});
