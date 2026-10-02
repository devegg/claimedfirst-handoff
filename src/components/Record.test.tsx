// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Record from "./Record";
import { RECORD_STYLES } from "@/lib/record-styles";

afterEach(cleanup);

describe("Record", () => {
  it("is an accessible image by default", () => {
    render(<Record style="ember" size={96} />);
    expect(screen.getByRole("img", { name: "Placeholder artwork" })).toBeTruthy();
  });
  it("can be decorative", () => {
    const { container } = render(<Record style="ember" size={96} decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect((container.firstElementChild as HTMLElement).getAttribute("aria-hidden")).toBe("true");
  });
  it("sets size and a different label color per style", () => {
    const colors = new Set<string>();
    for (const s of RECORD_STYLES) {
      const { container, unmount } = render(<Record style={s} size={64} />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.getAttribute("data-style")).toBe(s);
      expect(el.style.width).toBe("64px");
      colors.add(el.style.getPropertyValue("--record-label"));
      unmount();
    }
    expect(colors.size).toBe(6);
  });
  it("has no file input", () => {
    const { container } = render(<Record style="classic" size={64} />);
    expect(container.querySelector("input")).toBeNull();
  });
});
