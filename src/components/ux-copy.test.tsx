// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc: vi.fn(), auth: { getUser: vi.fn() }, from: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("html-to-image", () => ({ toPng: vi.fn() }));

import DropButton from "./DropButton";
import ClaimButton from "./ClaimButton";
import TopSongsEditor from "./TopSongsEditor";
import ShareAction from "./ShareAction";

afterEach(cleanup);

describe("drop consequences", () => {
  it("lists what happens before the final drop button", () => {
    render(<DropButton claimId="c1" artistName="Ember Vale" />);
    const t = document.querySelector("dialog")!.textContent ?? "";
    expect(t).toContain("Your slot is freed.");
    expect(t).toContain("moves to Historical claims and keeps its number and date");
    expect(t).toContain("It stops earning points.");
    expect(t).toContain("Coming back to Ember Vale takes 30 days, and the new claim gets a later number.");
    expect(t.indexOf("stops earning points")).toBeLessThan(t.indexOf("Drop claim"));
  });
});

describe("claim note", () => {
  it("sits beside the claim button", () => {
    render(<ClaimButton artistId="a1" artistName="Ember Vale" nextNumber={7} />);
    expect(screen.getByRole("button", { name: "Claim as #7" })).toBeTruthy();
    expect(screen.getByText("Uses one of your roster slots. You choose who sees your name next.")).toBeTruthy();
  });
});

describe("top songs editor copy", () => {
  it("shows visible Song title and Song link labels on every row, plus the top line", () => {
    render(<TopSongsEditor artistId="a1" initial={[{ title: "One", url: "https://example.com/1" }, { title: "", url: "" }]} />);
    expect(screen.getByText("Up to 10 songs. Edit any row, then save.")).toBeTruthy();
    expect(screen.getAllByRole("textbox", { name: /^Song title \d$/ })).toHaveLength(2);
    expect(screen.getAllByRole("textbox", { name: /^Song link \d$/ })).toHaveLength(2);
    expect(document.querySelectorAll("label").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("textbox", { name: "Song title 1" })).toBeTruthy();
  });
  it("shows the limit message near the top when 10 are present", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({ title: `S${i}`, url: `https://example.com/${i}` }));
    render(<TopSongsEditor artistId="a1" initial={ten} />);
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("You have reached 10 songs.");
    expect(note.compareDocumentPosition(screen.getByRole("textbox", { name: "Song title 1" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("share panel copy", () => {
  it("explains the image above the Story and Square choices", () => {
    render(<ShareAction mode="claim" artistName="Ember Vale" slug="ember-vale" claimNumber={7} handle="test_1" visibility="public" referralCode={null} date="2026-10-01" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    const p = screen.getByText("Make an image you can save or send.");
    expect(p.compareDocumentPosition(screen.getByLabelText("Story")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

import { findNumberLeak } from "@/lib/guide-guard";
it("new explanatory copy passes the guide number guard", () => {
  for (const s of [
    "Uses one of your roster slots. You choose who sees your name next.",
    "Each active artist uses one slot.", "Your slot is freed.",
    "It stops earning points.", "Make an image you can save or send.",
    "A page waits on Discover, under Needs scouts, until 3 different Scouts have added it.",
    "A qualified claimer is a different scout who has claimed that artist and whose account is at least 3 days old.",
  ]) expect(findNumberLeak(s), s).toBeNull();
});
