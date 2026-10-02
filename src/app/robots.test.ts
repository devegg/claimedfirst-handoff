import { expect, test } from "vitest";
import robots from "./robots";

test("robots.txt disallows everything during the private trial", () => {
  expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
});
