// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import DropButton from "./DropButton";

afterEach(cleanup);

test("inside the 3-day lock the Drop button is disabled with the unlock time and the reason", () => {
  const until = new Date(Date.now() + 86400_000).toISOString();
  render(<DropButton claimId="c1" artistName="Test Band" lockedUntil={until} />);
  const btn = screen.getByRole("button", { name: "Drop" }) as HTMLButtonElement;
  expect(btn.disabled).toBe(true);
  expect(document.body.textContent).toContain("Locked until");
  expect(document.body.textContent).toMatch(/Locked until .+\d{1,2}:\d{2}/);
  expect(document.body.textContent).toContain("New claims are locked for 3 days so numbers stay meaningful.");
  expect(btn.getAttribute("aria-describedby")).toBeTruthy();
});

test("after the lock Drop works as before and the confirmation explains Historical", () => {
  render(<DropButton claimId="c1" artistName="Test Band" lockedUntil={null} />);
  expect((screen.getByRole("button", { name: "Drop" }) as HTMLButtonElement).disabled).toBe(false);
  expect(document.body.textContent).toContain("moves to Historical claims");
  expect(document.body.textContent).not.toContain("Locked until");
});
