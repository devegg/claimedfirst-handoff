// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import InfoTip from "./InfoTip";

afterEach(cleanup);

test("the text is in the markup without JavaScript, inside a details element", () => {
  const html = renderToStaticMarkup(<InfoTip text="Because." label="Why?" />);
  expect(html).toContain("<details");
  expect(html).toContain("<summary");
  expect(html).toContain('role="status"');
  expect(html).toContain("Because.");
});

test("the summary has an accessible name", () => {
  render(<InfoTip text="Because." label="Why is this?" />);
  expect(screen.getByLabelText("Why is this?")).toBeTruthy();
});

test("Escape and an outside click close it, and no focus trap is added", () => {
  const { container } = render(<div><InfoTip text="Because." /><button type="button">Outside</button></div>);
  const d = container.querySelector("details") as HTMLDetailsElement;
  d.open = true;
  fireEvent.keyDown(document, { key: "Escape" });
  expect(d.open).toBe(false);
  d.open = true;
  fireEvent.click(screen.getByText("Outside"));
  expect(d.open).toBe(false);
  d.open = true;
  fireEvent.click(d.querySelector("summary") as HTMLElement);
  expect(d.querySelectorAll("[tabindex]").length).toBe(0);
});
