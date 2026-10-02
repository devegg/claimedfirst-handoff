// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import FoundersBoard from "./FoundersBoard";

test("empty state and provisional note, with no old 14-day rule text", () => {
  const { container } = render(<FoundersBoard rows={[]} />);
  expect(container.textContent).toContain("No claims yet.");
  expect(container.textContent).toContain("Newer ones are provisional.");
  expect(container.textContent).toContain("until it has been held for 14 days it is provisional".replace("until", "Until"));
  expect(container.textContent).not.toMatch(/appears here after/);
});

test("provisional rows are greyed with days left, early drops say dropped after N days, masked rows stay anonymous", () => {
  const { container } = render(<FoundersBoard rows={[
    { claim_number: 1, handle: "test_1", status: "active", claimed_at: "2026-01-02T10:00:00Z", held_days: 4, provisional: true, dropped_early: false },
    { claim_number: 2, handle: "Anonymous scout", status: "historical", claimed_at: "2026-01-03T00:00:00Z", held_days: 6, provisional: false, dropped_early: true, dropped_after_days: 6 },
    { claim_number: 3, handle: "test_3", status: "historical", claimed_at: "2026-01-04T10:00:00Z", held_days: 40, provisional: false, dropped_early: false, dropped_after_days: 40 },
  ]} />);
  const items = container.querySelectorAll("li");
  expect(items[0].className).toContain("row-provisional");
  expect(items[0].textContent).toContain("counts in 10 days");
  expect(items[1].textContent).toContain("Anonymous scout");
  expect(items[1].textContent).toContain("dropped after 6 days");
  expect(items[1].textContent).not.toContain("Historical");
  expect(items[2].textContent).toContain("Historical");
});

test("labels only historical rows and shows masked handles as given", () => {
  const { container } = render(<FoundersBoard rows={[
    { claim_number: 1, handle: "test_1", status: "active", claimed_at: "2026-01-02T10:00:00Z" },
    { claim_number: 2, handle: "Anonymous scout", status: "historical", claimed_at: "2026-01-03T10:00:00Z" },
  ]} />);
  const items = container.querySelectorAll("li");
  expect(items.length).toBe(2);
  expect(items[0].textContent).toContain("#1 test_1");
  expect(items[0].textContent).not.toContain("Historical");
  expect(items[1].textContent).toContain("Anonymous scout");
  expect(items[1].textContent).toContain("Historical");
  expect(items[1].textContent).toContain("2026-01-03");
});
