import { canonicalArtistKey } from "@/lib/artist-url";

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 80;
/** A pasted profile link can be longer than a name, so links get a wider cap. */
export const SEARCH_LINK_MAX = 200;

export type SearchInput =
  | { kind: "none" }
  | { kind: "short"; q: string }
  | { kind: "text"; q: string; terms: string[] }
  | { kind: "link"; q: string; key: string };

export function looksLikeLink(s: string): boolean {
  return /^https?:\/\//i.test(s) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(s);
}

export function foldText(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Escapes characters that mean something in a LIKE pattern (and in a quoted PostgREST value). */
export function escapeLike(s: string): string {
  return s.replace(/[\\"]/g, "").replace(/[%_]/g, "\\\\$&");
}

export function parseSearch(raw: string | string[] | undefined): SearchInput {
  const v = (Array.isArray(raw) ? raw[0] : raw)?.trim().replace(/\s+/g, " ") ?? "";
  if (!v) return { kind: "none" };
  if (looksLikeLink(v)) {
    const q = v.slice(0, SEARCH_LINK_MAX);
    try { return { kind: "link", q, key: canonicalArtistKey(q).key }; } catch { /* fall through to text */ }
  }
  const q = v.slice(0, SEARCH_MAX);
  if ([...q].length < SEARCH_MIN) return { kind: "short", q };
  // A leading @ is part of a handle, not of the name or address stored.
  const bare = q.replace(/^@+/, "");
  const base = bare.length >= 1 ? bare : q;
  const terms = [...new Set([base, foldText(base)])].map(escapeLike);
  return { kind: "text", q, terms };
}

/** PostgREST or() filter that matches the name or the page address (slug) against any term. */
export function orFilter(terms: string[]): string {
  return terms.flatMap((t) => [`name.ilike."%${t}%"`, `slug.ilike."%${t}%"`]).join(",");
}
