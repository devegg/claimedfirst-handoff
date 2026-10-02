import { beforeEach, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
import { submitArtist } from "./actions";

const form = (name: string, url = "https://suno.com/@emberv") => {
  const f = new FormData();
  f.set("name", name); f.set("url", url);
  return f;
};
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: { slug: "emberv", status: "pending" }, error: null }); });

it("refuses a blocked name with the friendly message, never calls the database, never echoes the name", async () => {
  const r = await submitArtist(null, form("Big Retard Energy"));
  expect(r).toEqual({ error: "That name can't be used. Use the name the artist goes by." });
  expect(JSON.stringify(r)).not.toMatch(/retard/i);
  expect(rpc).not.toHaveBeenCalled();
});

it("refuses promotion and symbol-only names", async () => {
  for (const n of ["www.example.com", "me@example.com", "!!!", "Aaaaaaaaaa"]) {
    expect((await submitArtist(null, form(n)))?.error).toMatch(/can't be used/);
  }
  expect(rpc).not.toHaveBeenCalled();
});

it("lets ordinary and look-alike names through to the database", async () => {
  for (const n of ["Assassin", "Cocktail Hour", "Björk", "Prince ♥"]) {
    const r = await submitArtist(null, form(n));
    expect(r).toEqual({ pending: { name: n } });
  }
  expect(rpc).toHaveBeenCalledTimes(4);
});

it("maps the database's own refusal to the same message", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "name_not_allowed" } });
  expect((await submitArtist(null, form("Fine Name")))?.error).toBe("That name can't be used. Use the name the artist goes by.");
});
