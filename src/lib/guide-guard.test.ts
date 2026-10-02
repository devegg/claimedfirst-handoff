import { expect, test } from "vitest";
import { GUIDE, GUIDE_IDS } from "./guide";
import { findNumberLeak, LADDER_TEXT } from "./guide-guard";

test("the guard catches digits and spelled-out numbers next to slots, friends and referrals", () => {
  for (const bad of ["ten friends", "twenty slots", "two referrals", "15 slots", "starts with 5 slots and 10 more", "invite 100 friends", "10 roster slots", "slots 12", "thirty referrals unlock more", "fifty slots"]) {
    expect(findNumberLeak(bad), bad).not.toBeNull();
  }
});
test("the guard allows only the two sanctioned phrases", () => {
  expect(findNumberLeak("Everyone starts with 5 slots. You start with 5, and bringing friends can open more.")).toBeNull();
  expect(findNumberLeak("A claim uses one slot.")).toBeNull();
});
test("the public ladder is allowed only as the exact sentence", () => {
  expect(findNumberLeak(`You start with 5 slots. ${LADDER_TEXT}, which is the most.`)).toBeNull();
  expect(findNumberLeak("3 friends open 15 slots")).not.toBeNull();
  expect(findNumberLeak("2 friends open 10 slots")).not.toBeNull();
  expect(findNumberLeak(LADDER_TEXT.replace("20 friends", "25 friends"))).not.toBeNull();
});
test("the real guide text passes", () => {
  for (const id of GUIDE_IDS) expect(findNumberLeak(`${GUIDE[id].short} ${GUIDE[id].body}`), id).toBeNull();
});
