// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { RosterSlots } from "./RosterSlots";

test("5 unlocked slots render exactly 5 cells, no markers and no text", () => {
  const { container } = render(<RosterSlots used={3} unlocked={5} />);
  expect(container.querySelectorAll("[data-slot]").length).toBe(5);
  expect(container.querySelectorAll("[data-marker]").length).toBe(0);
  expect(container.querySelectorAll("[data-state='open']").length).toBe(2);
  expect(container.querySelectorAll("[data-state='filled']").length).toBe(3);
  expect(container.textContent).toBe("");
});

test("only unlocked slots are drawn, up to 50", () => {
  const at = (n: number) => render(<RosterSlots used={0} unlocked={n} />).container;
  expect(at(10).querySelectorAll("[data-slot]").length).toBe(10);
  const full = at(50);
  expect(full.querySelectorAll("[data-slot]").length).toBe(50);
  expect(full.querySelectorAll("[data-state='locked']").length).toBe(0);
});
