// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ShareCard from "./ShareCard";

afterEach(cleanup);
const base = { artistName: "Ember Vale", slug: "ember-vale", claimNumber: 7, handle: "test_1", date: "2026-10-01" };

describe("ShareCard", () => {
  it("story is 1080x1920", () => {
    const { container } = render(<ShareCard {...base} mode="claim" ratio="story" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("story");
    expect(el.style.width).toBe("1080px");
    expect(el.style.height).toBe("1920px");
  });
  it("square is 1080x1080", () => {
    const { container } = render(<ShareCard {...base} mode="claim" ratio="square" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("square");
    expect(el.style.height).toBe("1080px");
  });
  it("claim mode text", () => {
    render(<ShareCard {...base} mode="claim" ratio="story" />);
    expect(screen.getByText("I CLAIMED")).toBeTruthy();
    expect(screen.getByText("#7")).toBeTruthy();
    expect(screen.getByText("Ember Vale")).toBeTruthy();
    expect(screen.getByText("@test_1")).toBeTruthy();
    expect(screen.getByText("claimedfirst.com/artist/ember-vale")).toBeTruthy();
  });
  it("shows the claim date as plain text, in both modes", () => {
    render(<ShareCard {...base} mode="claim" ratio="story" />);
    expect(screen.getByText("Claimed Oct 1, 2026")).toBeTruthy();
    cleanup();
    render(<ShareCard {...base} date="2026-10-01T23:59:59Z" mode="milestone" ratio="square" milestone={10} />);
    expect(screen.getByText("Claimed Oct 1, 2026")).toBeTruthy();
  });
  it("leaves the date line out when the date cannot be read", () => {
    const { container } = render(<ShareCard {...base} date="" mode="claim" ratio="story" />);
    expect(container.textContent).not.toContain("Claimed ");
  });
  it("keeps every style inline so html-to-image can draw it", () => {
    const { container } = render(<ShareCard {...base} mode="claim" ratio="story" />);
    const root = container.firstElementChild as HTMLElement;
    const line = [...container.querySelectorAll("div")].find((d) => d.textContent === "Claimed Oct 1, 2026") as HTMLElement;
    expect(root.style.width).toBe("1080px");
    expect(line.closest("[style]")).toBeTruthy();
    expect(container.querySelectorAll("style, link").length).toBe(0);
  });
  it("milestone mode text with formatted number", () => {
    render(<ShareCard {...base} mode="milestone" ratio="square" milestone={1000} />);
    expect(screen.getByText("I WAS EARLY")).toBeTruthy();
    expect(screen.getByText("#7 of 1,000 claimers now.")).toBeTruthy();
  });
  it("no handle for non-public", () => {
    const { container } = render(<ShareCard {...base} handle={null} mode="claim" ratio="story" />);
    expect(container.textContent).not.toContain("@");
    expect(container.textContent).not.toContain("test_1");
  });
  it("never contains an exclamation mark", () => {
    const a = render(<ShareCard {...base} mode="claim" ratio="story" />);
    expect(a.container.textContent).not.toContain("!");
    cleanup();
    const b = render(<ShareCard {...base} mode="milestone" ratio="story" milestone={100} />);
    expect(b.container.textContent).not.toContain("!");
  });
  it("style prop changes the style marker and label color", () => {
    const a = render(<ShareCard {...base} mode="claim" ratio="story" />);
    const ea = a.container.firstElementChild as HTMLElement;
    expect(ea.getAttribute("data-style")).toBe("classic");
    const classicLabel = ea.style.getPropertyValue("--record-label");
    cleanup();
    const b = render(<ShareCard {...base} mode="claim" ratio="story" style="tide" />);
    const eb = b.container.firstElementChild as HTMLElement;
    expect(eb.getAttribute("data-style")).toBe("tide");
    expect(eb.style.getPropertyValue("--record-label")).not.toBe(classicLabel);
  });
});
