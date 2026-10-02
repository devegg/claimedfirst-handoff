// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const getSession = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ auth: { getSession } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import VerifyPanel from "./VerifyPanel";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ ok: false, reason: "not_found" })
      : Response.json({ code: "cf-ABC123", links: [{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x" }, { id: "l2", platform: "instagram", url: "https://instagram.com/x" }] }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows the code and links, and checks the chosen page with the bearer token", async () => {
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  expect(await screen.findByText("cf-ABC123")).toBeTruthy();
  expect(fetchMock.mock.calls[0][0]).toBe("/api/verify?artistId=a1");
  expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
  fireEvent.change(screen.getByLabelText("Page to check"), { target: { value: "l2" } });
  fireEvent.click(screen.getByRole("button", { name: "Check now" }));
  expect((await screen.findByRole("status")).textContent).toContain("The code was not found on that page.");
  const post = fetchMock.mock.calls[1];
  expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ artistId: "a1", linkId: "l2" });
  expect(refresh).not.toHaveBeenCalled();
});

it("refreshes after success", async () => {
  fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
    init?.method === "POST" ? Response.json({ ok: true, reason: "found" }) : Response.json({ code: "cf-ABC123", links: [{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x" }] }));
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-ABC123");
  fireEvent.click(screen.getByRole("button", { name: "Check now" }));
  expect((await screen.findByRole("status")).textContent).toBe("Verified. This page is now yours.");
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});

it("shows a plain error when the code cannot be loaded", async () => {
  fetchMock.mockResolvedValue(Response.json({ ok: false, reason: "server_error" }, { status: 500 }));
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong on our side");
});

it("tells the owner what to do when a page cannot be read, and shows the rate-limit message", async () => {
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-ABC123");
  expect(screen.getByText(/add the code to another page you listed and check again/i)).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/available later/);
  fetchMock.mockImplementation(async () => Response.json({ ok: false, reason: "rate_limited" }, { status: 429 }));
  fireEvent.click(screen.getByRole("button", { name: "Check now" }));
  expect((await screen.findByRole("status")).textContent).toBe("You are checking too often. Please try again later.");
});

it("when the code is too old, says so and shows the new code from the server", async () => {
  let gets = 0;
  fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ ok: false, reason: "code_expired" })
      : Response.json({ code: ++gets === 1 ? "cf-OLD111" : "cf-NEW222", links: [{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x" }] }));
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-OLD111");
  fireEvent.click(screen.getByRole("button", { name: "Check now" }));
  expect(await screen.findByText("cf-NEW222")).toBeTruthy();
  expect((await screen.findByRole("status")).textContent).toContain("more than 24 hours old");
  expect(screen.queryByText("cf-OLD111")).toBeNull();
  expect(refresh).not.toHaveBeenCalled();
});

it("a code that was already used is refused with a clear reason and replaced", async () => {
  let gets = 0;
  fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ ok: false, reason: "code_used" })
      : Response.json({ code: ++gets === 1 ? "cf-USED11" : "cf-FRESH2", links: [{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x" }] }));
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-USED11");
  fireEvent.click(screen.getByRole("button", { name: "Check now" }));
  expect(await screen.findByText("cf-FRESH2")).toBeTruthy();
  expect((await screen.findByRole("status")).textContent).toContain("already been used");
});

it("tells the owner a code lasts 24 hours and works once", async () => {
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-ABC123");
  expect(screen.getByText("A code works for 24 hours, and only once.")).toBeTruthy();
});

const withExpiry = (expiresAt: string | null) => fetchMock.mockImplementation(async () =>
  Response.json({ code: "cf-ABC123", issuedAt: null, expiresAt, links: [{ id: "l1", platform: "spotify", url: "https://open.spotify.com/artist/x" }] }));

it("shows the expiry in local time next to the code, and no Get a new code while it is valid", async () => {
  withExpiry(new Date(Date.now() + 3600_000).toISOString());
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-ABC123");
  expect(document.body.textContent).toMatch(/Expires .+ \(your local time\)/);
  expect(screen.queryByRole("button", { name: "Get a new code" })).toBeNull();
});

it("after expiry offers Get a new code, which reloads the code", async () => {
  withExpiry(new Date(Date.now() - 60_000).toISOString());
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-ABC123");
  expect(document.body.textContent).toContain("This code has expired.");
  const calls = fetchMock.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Get a new code" }));
  await waitFor(() => expect(fetchMock.mock.calls.length).toBe(calls + 1));
});

it("shows nothing about expiry when the time is unknown", async () => {
  withExpiry(null);
  render(<VerifyPanel artistId="a1" artistName="Test Band" />);
  await screen.findByText("cf-ABC123");
  expect(document.body.textContent).not.toMatch(/Expires|expired/);
  expect(screen.queryByRole("button", { name: "Get a new code" })).toBeNull();
});
