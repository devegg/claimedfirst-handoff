// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("html-to-image", () => ({ toPng: vi.fn(async () => "data:image/png;base64,AAAA") }));
import ShareAction from "./ShareAction";

const props = { mode: "claim" as const, artistName: "Ember Vale", slug: "ember-vale", claimNumber: 7,
  handle: "test_1", referralCode: "abc123", date: "2026-10-01" };
const setNav = (o: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(o)) Object.defineProperty(navigator, k, { value: v, configurable: true });
};
let click: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => new Blob(["x"]) })));
  click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  setNav({ canShare: undefined, share: undefined, clipboard: { writeText: vi.fn(async () => {}) } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const open = (vis: string) => {
  render(<ShareAction {...props} visibility={vis as "public"} />);
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
};
const cardText = () => document.querySelector(".share-card")!.textContent ?? "";

describe("handle hiding", () => {
  it("public shows the handle in dialog and card", () => {
    open("public");
    expect(screen.getByText("The card will show @test_1.")).toBeTruthy();
    expect(cardText()).toContain("@test_1");
  });
  it.each(["artist", "anonymous", "weird", ""])("%j never shows the handle", (v) => {
    open(v);
    expect(screen.getByText(/will not show your name/)).toBeTruthy();
    expect(cardText()).not.toContain("test_1");
    expect(cardText()).not.toContain("@");
  });
});

const make = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Make card" }));
};

describe("sharing", () => {
  it("AbortError is a polite cancel, no download", async () => {
    const share = vi.fn(async () => { throw new DOMException("x", "AbortError"); });
    setNav({ canShare: () => true, share });
    open("public"); await make();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/cancelled/));
    expect(click).not.toHaveBeenCalled();
  });
  it("NotAllowedError falls back to download and copy", async () => {
    const share = vi.fn(async () => { throw new DOMException("x", "NotAllowedError"); });
    const writeText = vi.fn(async () => {});
    setNav({ canShare: () => true, share, clipboard: { writeText } });
    open("public"); await make();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/downloaded and link copied/));
    expect(click).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/c/ember-vale/7?ref=abc123"));
  });
  it("files share puts the link in text only, no url", async () => {
    const share = vi.fn(async () => {});
    setNav({ canShare: () => true, share });
    open("public"); await make();
    await waitFor(() => expect(share).toHaveBeenCalled());
    const arg = (share.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(arg.url).toBeUndefined();
    expect(String(arg.text)).toContain("/c/ember-vale/7?ref=abc123");
    expect((arg.files as File[]).length).toBe(1);
  });
  it("canShare false falls back", async () => {
    setNav({ canShare: () => false, share: vi.fn() });
    open("public"); await make();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/downloaded and link copied/));
    expect(click).toHaveBeenCalled();
  });
  it("clipboard denial stays polite", async () => {
    setNav({ canShare: undefined, clipboard: { writeText: vi.fn(async () => { throw new Error("denied"); }) } });
    open("public"); await make();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Copy this link/));
    expect(screen.getByRole("status").textContent).not.toMatch(/error|failed|could not/i);
  });
});
