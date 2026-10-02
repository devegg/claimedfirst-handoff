import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
import TermsPage, { metadata as termsMeta } from "./page";
import PrivacyPage, { metadata as privacyMeta } from "../privacy/page";

const DRAFT = "Draft: pending legal review. This page is not a published policy.";

test("terms shows the draft notice first and the key headings", () => {
  const html = renderToStaticMarkup(<TermsPage />);
  expect(html.indexOf(DRAFT)).toBeGreaterThan(-1);
  expect(html.indexOf(DRAFT)).toBeLessThan(html.indexOf("<h2"));
  expect(html).toContain("<h1>Terms</h1>");
  for (const h of ["Recognition only", "Not an investment", "Links out only", "Who sees your name", "Asking for a page to be removed"]) expect(html).toContain(h);
  expect(html).not.toContain("!");
  expect(termsMeta.title).toBe("Terms");
});

test("privacy shows the draft notice first and the key headings", () => {
  const html = renderToStaticMarkup(<PrivacyPage />);
  expect(html.indexOf(DRAFT)).toBeGreaterThan(-1);
  expect(html.indexOf(DRAFT)).toBeLessThan(html.indexOf("<h2"));
  expect(html).toContain("<h1>Privacy</h1>");
  for (const h of ["What we store", "Who sees your name", "Your data", "Asking for a page to be removed"]) expect(html).toContain(h);
  expect(html).not.toContain("!");
  expect(privacyMeta.title).toBe("Privacy");
});

test("terms says claims and accounts cannot be sold, traded or transferred", () => {
  const html = renderToStaticMarkup(<TermsPage />);
  expect(html).toContain("Claims and accounts cannot be sold, traded or transferred, and nobody may pay for a claim.");
  expect(html).toContain(DRAFT);
});
