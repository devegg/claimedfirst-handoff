const MESSAGES: Record<string, string> = {
  found: "Verified. This page is now yours.",
  not_found: "The code was not found on that page. Add it to the bio, save, and check again.",
  blocked: "That page would not let us read it. Try another listed page.",
  timeout: "That page took too long to answer. Try again in a moment.",
  too_large: "That page is too large for us to read. Try another listed page.",
  fetch_error: "We could not load that page. Check the address and try again.",
  unsafe_url: "We can only check public https pages, and that link is not one.",
  code_expired: "That code is more than 24 hours old, so it no longer works. Use the new code shown above.",
  code_used: "That code has already been used. Use the new code shown above.",
  link_not_found: "That page is no longer listed. Reload and pick another.",
  server_error: "Something went wrong on our side. Try again.",
  rate_limited: "You are checking too often. Please try again later.",
  unauthorized: "Sign in again to continue.",
};
export function verifyMessage(reason: string | null | undefined): string {
  return (reason && MESSAGES[reason]) || "Something went wrong. Try again.";
}
