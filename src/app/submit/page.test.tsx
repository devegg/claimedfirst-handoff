// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./actions", () => ({ submitArtist: vi.fn() }));
import SubmitPage from "./page";
afterEach(cleanup);

it("says who it is for, which links work and where a pending page waits", () => {
  render(<SubmitPage />);
  expect(screen.getByText("Anyone can add an artist. Paste a link to the artist's public page.")).toBeTruthy();
  expect(screen.getByText("Suno profile, YouTube channel, or the artist's own website.")).toBeTruthy();
  expect(screen.getByText("A page waits on Discover, under Needs scouts, until 3 different Scouts have added it.")).toBeTruthy();
});

it("prefills the name from the name query", async () => {
  const value = { name: "Ember Vale" };
  render(<SubmitPage searchParams={Object.assign(Promise.resolve(value), { status: "fulfilled", value })} />);
  expect(((await screen.findByLabelText("Artist name")) as HTMLInputElement).value).toBe("Ember Vale");
});

it("prefills the link from an https url query and ignores other schemes", async () => {
  const v1 = { name: "Ember Vale", url: "https://suno.com/@embervale" };
  render(<SubmitPage searchParams={Object.assign(Promise.resolve(v1), { status: "fulfilled", value: v1 })} />);
  expect(((await screen.findByLabelText("Artist link")) as HTMLInputElement).value).toBe("https://suno.com/@embervale");
  cleanup();
  const v2 = { url: "javascript:alert(1)" };
  render(<SubmitPage searchParams={Object.assign(Promise.resolve(v2), { status: "fulfilled", value: v2 })} />);
  expect(((await screen.findByLabelText("Artist link")) as HTMLInputElement).value).toBe("");
});
