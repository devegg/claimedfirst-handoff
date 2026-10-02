import { expect, it } from "vitest";
import { verifyMessage } from "./verify-messages";

it("has plain copy for every reason", () => {
  for (const r of ["found", "not_found", "blocked", "timeout", "too_large", "fetch_error", "unsafe_url", "link_not_found", "server_error", "code_expired", "code_used"]) {
    expect(verifyMessage(r)).not.toBe("Something went wrong. Try again.");
    expect(verifyMessage(r)).not.toContain("!");
  }
  expect(verifyMessage("found")).toBe("Verified. This page is now yours.");
  expect(verifyMessage("zzz")).toBe("Something went wrong. Try again.");
  expect(verifyMessage(null)).toBe("Something went wrong. Try again.");
});

it("explains the rate limit in plain words", () => {
  expect(verifyMessage("rate_limited")).toBe("You are checking too often. Please try again later.");
});
