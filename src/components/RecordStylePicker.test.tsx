// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const refresh = vi.fn();
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ rpc }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import RecordStylePicker from "./RecordStylePicker";
import { defaultStyleFor } from "@/lib/record-styles";

beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ data: null, error: null }); });
afterEach(cleanup);

describe("RecordStylePicker", () => {
  it("renders six radio options in a radiogroup, no file input", () => {
    const { container } = render(<RecordStylePicker artistId="a1" slug="s" stored={null} />);
    expect(screen.getByRole("radiogroup", { name: "Record style" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
  it("preselects the stored style, else the slug default", () => {
    render(<RecordStylePicker artistId="a1" slug="s" stored="tide" />);
    expect((screen.getByRole("radio", { name: "Tide" }) as HTMLInputElement).checked).toBe(true);
    cleanup();
    render(<RecordStylePicker artistId="a1" slug="s" stored="custom.png" />);
    const d = defaultStyleFor("s");
    const checked = screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute("value")).toBe(d);
  });
  it("saves the chosen style", async () => {
    render(<RecordStylePicker artistId="a1" slug="s" stored="tide" />);
    fireEvent.click(screen.getByRole("radio", { name: "Dusk" }));
    fireEvent.click(screen.getByRole("button", { name: "Save record style" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_record_style", { p_artist: "a1", p_style: "dusk" }));
    expect((await screen.findByRole("status")).textContent).toContain("Saved");
    expect(refresh).toHaveBeenCalled();
  });
  it("sends null for the default", async () => {
    render(<RecordStylePicker artistId="a1" slug="s" stored="tide" />);
    fireEvent.click(screen.getByRole("button", { name: "Use the default" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("set_record_style", { p_artist: "a1", p_style: null }));
    expect((await screen.findByRole("status")).textContent).toContain("default");
  });
  it("maps errors to a plain message", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not_owner" } });
    render(<RecordStylePicker artistId="a1" slug="s" stored={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Save record style" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Only the verified owner of this page can do that.");
    expect(alert.textContent).not.toContain("!");
  });
  it("maps invalid_style and thrown errors", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "invalid_style" } });
    render(<RecordStylePicker artistId="a1" slug="s" stored={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Save record style" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not one of the available");
    rpc.mockRejectedValueOnce(new Error("net"));
    fireEvent.click(screen.getByRole("button", { name: "Save record style" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Something went wrong"));
  });
});
