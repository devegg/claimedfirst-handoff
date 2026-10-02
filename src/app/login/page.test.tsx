import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({}) }));
import LoginPage from "./page";

afterEach(() => vi.unstubAllEnvs());

test("magic link only when OAuth is not enabled", () => {
  vi.stubEnv("NEXT_PUBLIC_OAUTH_ENABLED", "");
  const html = renderToStaticMarkup(<LoginPage />);
  expect(html).toContain("Sign in or create your account");
  expect(html).toContain("We will email you a secure sign-in link. No password needed.");
  expect(html).toContain("Email me a sign-in link");
  expect(html).not.toContain("Google");
  expect(html).not.toContain("Apple");
  expect(html).not.toMatch(/credentials|configured|environment|Disabled/i);
  expect(html).not.toContain("!");
});

test("Google and Apple buttons appear when OAuth is enabled", () => {
  vi.stubEnv("NEXT_PUBLIC_OAUTH_ENABLED", "true");
  const html = renderToStaticMarkup(<LoginPage />);
  expect(html).toContain("Continue with Google");
  expect(html).toContain("Continue with Apple");
  expect(html).not.toMatch(/credentials|configured/i);
});
