// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PageAddress from "./PageAddress";

const fetchMock = vi.fn();
const reply = (body: object) => fetchMock.mockImplementation(async () => Response.json(body));
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("renders nothing until a link is pasted", () => {
  const { container } = render(<PageAddress url="" />);
  expect(container.textContent).toBe("");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("prefills the address from the handle and shows available", async () => {
  reply({ state: "available", matches: [] });
  render(<PageAddress url="https://suno.com/@emberv" />);
  expect((screen.getByLabelText(/^Page address/) as HTMLInputElement).value).toBe("emberv");
  await waitFor(() => expect(screen.getByTestId("slug-status").textContent).toContain("claimedfirst.com/artist/emberv is available"));
  expect(String(fetchMock.mock.calls[0][0])).toContain("slug=emberv");
});

it("taken by another artist: says so and links to them", async () => {
  reply({ state: "taken", existing: { name: "EmberV Other", slug: "emberv" }, matches: [] });
  render(<PageAddress url="https://youtube.com/@emberv" />);
  await waitFor(() => expect(screen.getByTestId("slug-status").textContent).toContain("taken by another artist"));
  expect(screen.getByRole("link", { name: "EmberV Other" }).getAttribute("href")).toBe("/artist/emberv");
});

it("already listed: links to the existing page", async () => {
  reply({ state: "listed", existing: { name: "EmberV", slug: "emberv" }, matches: [] });
  render(<PageAddress url="https://suno.com/@emberv" />);
  await waitFor(() => expect(screen.getByTestId("slug-status").textContent).toContain("already listed"));
  expect(screen.getByRole("link", { name: "EmberV" }).getAttribute("href")).toBe("/artist/emberv");
});

it("editing the address is debounced, re-checked, and lists up to 5 existing artists", async () => {
  reply({ state: "available", matches: [1, 2, 3, 4, 5].map((n) => ({ name: `Ray ${n}`, slug: `ray-${n}` })) });
  render(<PageAddress url="https://suno.com/@emberv" />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const input = screen.getByLabelText(/^Page address/) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "r" } });
  fireEvent.change(input, { target: { value: "ra" } });
  fireEvent.change(input, { target: { value: "ray" } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(String(fetchMock.mock.calls[1][0])).toContain("slug=ray");
  expect(screen.getByTestId("slug-matches").querySelectorAll("li")).toHaveLength(5);
});

it("a bad address shows the format hint without waiting for the server", () => {
  reply({ state: "invalid_slug", matches: [] });
  render(<PageAddress url="https://suno.com/@emberv" />);
  fireEvent.change(screen.getByLabelText(/^Page address/), { target: { value: "-x" } });
  expect(screen.getByTestId("slug-status").textContent).toContain("2-30 characters");
});

it("submits the chosen slug with the form", () => {
  reply({ state: "available", matches: [] });
  render(<form><PageAddress url="https://suno.com/@emberv" /></form>);
  expect((screen.getByLabelText(/^Page address/) as HTMLInputElement).name).toBe("slug");
});

it("pasting a different link re-derives the address", () => {
  reply({ state: "available", matches: [] });
  const { rerender } = render(<PageAddress url="https://suno.com/@emberv" />);
  const input = screen.getByLabelText(/^Page address/) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "mine" } });
  expect(input.value).toBe("mine");
  rerender(<PageAddress url="https://suno.com/@other" />);
  expect((screen.getByLabelText(/^Page address/) as HTMLInputElement).value).toBe("other");
});

it("a result for an older address is not shown for the current one", async () => {
  let release: (r: Response) => void = () => {};
  fetchMock.mockImplementationOnce(async () => Response.json({ state: "available", matches: [] }));
  fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => { release = res; }));
  render(<PageAddress url="https://suno.com/@emberv" />);
  await waitFor(() => expect(screen.getByTestId("slug-status").textContent).toContain("is available"));
  fireEvent.change(screen.getByLabelText(/Page address/), { target: { value: "other" } });
  expect(screen.getByTestId("slug-status").textContent).toBe("Checking...");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  release(Response.json({ state: "taken", matches: [] }));
  await waitFor(() => expect(screen.getByTestId("slug-status").textContent).toContain("taken"));
});

it("a throttled check says to try again", async () => {
  fetchMock.mockImplementation(async () => new Response("{}", { status: 429 }));
  render(<PageAddress url="https://suno.com/@emberv" />);
  await waitFor(() => expect(screen.getByTestId("slug-status").textContent).toContain("Try again in a moment"));
});

it("the address prefix is part of the field description", () => {
  reply({ state: "available", matches: [] });
  render(<PageAddress url="https://suno.com/@emberv" />);
  expect(screen.getByLabelText(/^Page address/).getAttribute("aria-describedby")).toContain("slug-prefix");
});
