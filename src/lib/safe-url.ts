/** Only https:// URLs may be rendered as links. */
export function isHttpsUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

/**
 * Adds ClaimedFirst campaign parameters to an outbound link so the destination's analytics show where the
 * visit came from (rel="noreferrer" hides the Referer header). Applied at render time only; stored URLs are
 * untouched. Existing query strings and fragments are kept, and an existing utm_source is never overwritten.
 */
export function withClaimedFirstTag(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return url;
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", "ClaimedFirst");
      if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", "referral");
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** The destination host for a visible label: lowercase, without a leading www. Null when the value is not a URL. */
export function linkHost(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}
