import { expect, test, vi } from "vitest";

const signOutFn = vi.fn(async () => ({ error: null }));
const redirectFn = vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); });
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirectFn(to) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut: signOutFn } }) }));
import { signOut } from "./actions";

test("signOut ends the session and redirects home", async () => {
  await expect(signOut()).rejects.toThrow("REDIRECT:/");
  expect(signOutFn).toHaveBeenCalledTimes(1);
});
