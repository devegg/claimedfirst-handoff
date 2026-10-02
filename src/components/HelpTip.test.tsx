// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

afterEach(cleanup);
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import HelpTip from "./HelpTip";
import { GUIDE_IDS } from "@/lib/guide";

test("renders an accessible link to the guide section", () => {
  render(<><HelpTip id="claim" /><HelpTip id="hold-14" /><HelpTip id="privacy" /></>);
  const a = screen.getByRole("link", { name: "What is claim?" });
  expect(a.getAttribute("href")).toBe("/guide#claim");
  expect(a.hasAttribute("target")).toBe(false);
  expect(screen.getByRole("link", { name: "What is provisional claim?" }).getAttribute("href")).toBe("/guide#hold-14");
  expect(screen.getByRole("link", { name: "What is who sees your name?" }).getAttribute("href")).toBe("/guide#privacy");
});

// Ids that intentionally appear only in the guide, not next to a term in the app.
const GUIDE_ONLY: string[] = [];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx$/.test(n) && !/\.test\./.test(n) ? [readFileSync(p, "utf8")] : [];
  });
}

test("every guide id is placed in the app or listed as guide-only", () => {
  const all = sources(join(process.cwd(), "src")).join("\n");
  const used = new Set([...all.matchAll(/<(?:HelpTip\s+id|InfoTip\b[^>]*?\sguide)="([a-z0-9-]+)"/g)].map((m) => m[1]));
  for (const id of GUIDE_IDS) {
    if (GUIDE_ONLY.includes(id)) continue;
    expect(used.has(id), `no HelpTip for ${id}`).toBe(true);
  }
});

test("newTab opens the guide in a new tab, safely, and says so", () => {
  render(<HelpTip id="privacy" newTab />);
  const a = screen.getByRole("link", { name: /What is who sees your name\?/ });
  expect(a.getAttribute("target")).toBe("_blank");
  expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  expect(a.textContent).toContain("(opens in a new tab)");
});
