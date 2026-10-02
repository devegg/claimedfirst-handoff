import { describe, expect, it } from "vitest";
import { checkArtistName } from "./name-check";
import { BLOCKED_WORDS } from "./name-blocklist";

const ok = (n: string) => expect(checkArtistName(n)).toEqual({ ok: true });
const bad = (n: string, reason?: string) => {
  const r = checkArtistName(n);
  expect(r.ok).toBe(false);
  if (reason && !r.ok) expect(r.reason).toBe(reason);
};

describe("names that must pass", () => {
  it("ordinary names", () => { ok("Heart Echoes"); ok("Ember Vale"); ok("EmberV"); });
  it("does not trip on words that contain a blocked word (Scunthorpe)", () => {
    ok("Assassin"); ok("Cocktail Hour"); ok("Raccoon Dogs"); ok("Cocoon"); ok("Fagin's Kitchen"); ok("Spice Girls"); ok("Skyscraper");
    ok("Scunthorpe United"); ok("Passion Fruit"); ok("Grape Soda");
  });
  it("unicode, accents, emoji and symbols beside letters", () => {
    ok("Björk"); ok("Sigur Rós"); ok("Beyoncé"); ok("坂本龍一"); ok("Мумий Тролль"); ok("Prince ♥"); ok("Panic! At The Disco");
    ok("🎸 Rock Band"); ok("A$AP Rocky"); ok("P!nk"); ok("Ke$ha"); ok("MØ"); ok("deadmau5");
  });
  it("short numbers in names", () => { ok("Blink 182"); ok("2 Chainz"); ok("Maroon 5"); ok("Sum 41"); ok("Matchbox 20"); ok("U2"); });
  it("dots that are not domains", () => { ok("St. Vincent"); ok("Mr. Fingers"); ok("M.I.A."); ok("Jr. Jr."); });
  it("a few repeated characters", () => { ok("Aaaah Records"); ok("Zzzz Band"); });
});

describe("names that are refused", () => {
  it("only symbols or spaces", () => { bad("!!!", "symbols_only"); bad("♥♥♥", "symbols_only"); bad("   ", "symbols_only"); bad("🎸🎸", "symbols_only"); });
  it("links, emails and phone numbers", () => {
    bad("Visit my site www.example.com", "promotion");
    bad("https://example.com", "promotion");
    bad("buy at shop.example.io now", "promotion");
    bad("me@example.com", "promotion");
    bad("Call 555 123 4567", "promotion");
    bad("+1 (555) 123-4567", "promotion");
  });
  it("8 or more identical characters in a row", () => {
    bad("Aaaaaaaa", "repeated"); bad("Band!!!!!!!!", "repeated"); bad("xxxxxxxxxx Records", "repeated");
  });
  it("blocked words and phrases, however they are dressed up", () => {
    const list = [...BLOCKED_WORDS];
    for (const w of list) bad(w, "blocked");
    bad("The N1GG3R Band", "blocked");
    bad("F@GGOT", "blocked");
    bad("Kíll Yoursélf", "blocked");
    bad("KILL   YOURSELF", "blocked");
    bad("Big Retard Energy", "blocked");
    bad("nniiiggger", "blocked");
    bad("r3tard", "blocked");
    bad("Dr. Coon", "blocked");
    bad("Fuck The Rules", "blocked");
    bad("F u c k Band", "blocked");
    bad("Holy Sh1t", "blocked");
  });
  it("spaced, punctuated and plural evasions (words built from reversed strings)", () => {
    const rev = (w: string) => [...w].reverse().join("");
    const slur = rev("reggin"), nga = rev("aggin"), tard = rev("drater"), short = rev("gaf");
    const spaced = (w: string) => [...w].join(" ");
    bad(spaced(slur), "blocked");
    bad([...slur].join("."), "blocked");
    bad([...slur].join("-") + " Crew", "blocked");
    bad(`${nga}z`, "blocked");
    bad(`${tard}s United`, "blocked");
    bad(`The ${short}s`, "blocked");
    bad(spaced(slur.toUpperCase()), "blocked");
  });
  it("joined-letter check does not catch ordinary names", () => {
    ok("Class Act"); ok("Mass Assassin"); ok("Cock Tail Hour"); ok("Pass On Me"); ok("Scunthorpe Town"); ok("Bjork"); ok("A$AP Rocky"); ok("P!nk");
  });
  it("the reason never contains the blocked word", () => {
    const r = checkArtistName("Big Retard Energy");
    expect(JSON.stringify(r)).not.toMatch(/retard/i);
  });
});
