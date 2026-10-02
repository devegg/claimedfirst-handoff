// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VisibilitySheet from "./VisibilitySheet";

afterEach(cleanup);

function setup(over: Partial<React.ComponentProps<typeof VisibilitySheet>> = {}) {
  const props = {
    mode: "claim" as const,
    artistName: "Test Band",
    initialValue: "public",
    confirmLabel: "Claim",
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...over,
  };
  render(<VisibilitySheet {...props} />);
  return props;
}

describe("VisibilitySheet", () => {
  it("is a labelled modal dialog with the claim copy", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Claim Test Band" })).toBe(dialog);
    expect(screen.getByText("Your number is permanent. Who sees your name is your choice, and you can change it later.")).toBeTruthy();
    expect(screen.getByText("You keep your number, your points and your slot either way.")).toBeTruthy();
    expect(screen.getByRole("radiogroup")).toBeTruthy();
  });

  it("renders 3 labelled radios in claim mode with descriptions", () => {
    setup();
    expect(screen.getAllByRole("radio").length).toBe(3);
    for (const l of ["Show my name", "Artist only", "Anonymous"]) expect(screen.getByRole("radio", { name: l })).toBeTruthy();
    expect(screen.getByText('The artist sees you are a fan. Everyone else sees "Anonymous scout."')).toBeTruthy();
  });

  it("renders 2 radios in watch mode with the watch copy", () => {
    setup({ mode: "watch", initialValue: "anonymous", confirmLabel: "Watch" });
    expect(screen.getByRole("dialog", { name: "Watch Test Band" })).toBeTruthy();
    expect(screen.getAllByRole("radio").length).toBe(2);
    expect(screen.getByRole("radio", { name: "Name visible to the artist" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Anonymous" })).toBeTruthy();
    expect(screen.getByText("No number, no slot. The public never sees who is watching. Choose whether the artist can.")).toBeTruthy();
    expect(screen.queryByText(/your number, your points/)).toBeNull();
  });

  it("preselects initialValue and confirms the selected value", async () => {
    const p = setup({ initialValue: "artist" });
    expect((screen.getByRole("radio", { name: "Artist only" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Anonymous" }));
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(p.onConfirm).toHaveBeenCalledWith("anonymous"));
    await waitFor(() => expect(p.onClose).toHaveBeenCalled());
  });

  it("uses the confirm label", () => {
    setup({ confirmLabel: "Save choice" });
    expect(screen.getByRole("button", { name: "Save choice" })).toBeTruthy();
  });

  it("disables everything while busy and blocks double submission", async () => {
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const p = setup({ onConfirm });
    const confirm = screen.getByRole("button", { name: "Claim" }) as HTMLButtonElement;
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirm.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
    for (const r of screen.getAllByRole("radio")) expect((r as HTMLInputElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(p.onClose).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an error from a rejected onConfirm and re-enables", async () => {
    const p = setup({ onConfirm: vi.fn().mockRejectedValue(new Error("Your Roster is full.")) });
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Your Roster is full.");
    expect((screen.getByRole("button", { name: "Claim" }) as HTMLButtonElement).disabled).toBe(false);
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape and on Cancel", () => {
    const p = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(p.onClose).toHaveBeenCalledTimes(2);
  });

  it("moves focus in on open and back to the opener on close", () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <VisibilitySheet mode="claim" artistName="X" initialValue="public" confirmLabel="Claim"
              onConfirm={async () => {}} onClose={() => setOpen(false)} />
          )}
        </>
      );
    }
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("has no exclamation marks in any text", () => {
    setup();
    expect(document.body.textContent).not.toContain("!");
  });

  it("puts the first radio before every link, so initial focus and the first Tab stop are the options", () => {
    for (const mode of ["claim", "watch"] as const) {
      cleanup();
      setup({ mode, initialValue: mode === "claim" ? "public" : "anonymous" });
      const dialog = screen.getByRole("dialog");
      const first = dialog.querySelector<HTMLElement>('a[href], input:not([disabled]), button:not([disabled])')!;
      expect(first.tagName).toBe("INPUT");
      expect(first.getAttribute("type")).toBe("radio");
    }
  });

  it("the privacy help link opens in a new tab so the open sheet is not lost", () => {
    setup();
    const a = screen.getByRole("link", { name: /who sees your name/i });
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
