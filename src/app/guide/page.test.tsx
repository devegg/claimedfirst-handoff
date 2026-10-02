// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

afterEach(cleanup);
import GuidePage from "./page";
import { findNumberLeak } from "@/lib/guide-guard";
import { GUIDE, GUIDE_IDS } from "@/lib/guide";

test("guide page has h1, an anchored h2 section per entry in order", () => {
  const { container } = render(<GuidePage />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(GUIDE_IDS.length);
  const ids = [...container.querySelectorAll("section[id]")].map((s) => s.id);
  expect(ids).toEqual([...GUIDE_IDS]);
  for (const id of GUIDE_IDS) {
    const sec = container.querySelector(`section#${id}`)!;
    expect(sec.querySelector("h2")!.textContent).toBe(GUIDE[id].title);
  }
});

test("rendered guide never pairs numbers with slots, friends or referrals", () => {
  const { container } = render(<GuidePage />);
  const text = container.textContent ?? "";
  expect(findNumberLeak(text)).toBeNull();
  expect(text).not.toContain("!");
});
