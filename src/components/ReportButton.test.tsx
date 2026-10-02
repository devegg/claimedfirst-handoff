// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
const rpc = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc }) }));
import ReportButton from "./ReportButton";

afterEach(() => { cleanup(); rpc.mockReset(); });

async function send() {
  render(<ReportButton artistId="a1" />);
  fireEvent.click(screen.getByRole("button", { name: "Report this page" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Not the real artist" } });
  fireEvent.click(screen.getByRole("button", { name: "Send report" }));
}

test("a too-new account gets the friendly message with the explanation", async () => {
  rpc.mockResolvedValue({ error: { message: "account_too_new" } });
  await send();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Reports open when your account is 3 days old."));
  expect(document.body.textContent).toContain("Verified artists can report their own page at any time.");
});

test("other errors do not show the account age explanation", async () => {
  rpc.mockResolvedValue({ error: { message: "rate_limited" } });
  await send();
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(document.body.textContent).not.toContain("Verified artists can report");
});
