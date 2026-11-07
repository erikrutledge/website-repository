import test from "node:test";
import assert from "node:assert/strict";
import { swipeTarget } from "../src/scripts/habits/swipe.js";

test("horizontal swipes navigate in tab order without wrapping", () => {
  assert.equal(swipeTarget("today", -100, 5, 250), "history");
  assert.equal(swipeTarget("history", -100, 5, 250), "stats");
  assert.equal(swipeTarget("stats", -100, 5, 250), "setup");
  assert.equal(swipeTarget("setup", 100, 5, 250), "stats");
  assert.equal(swipeTarget("today", 100, 0, 250), null);
  assert.equal(swipeTarget("setup", -100, 0, 250), null);
});

test("small movements, vertical/diagonal scrolling and long drags do not switch tabs", () => {
  assert.equal(swipeTarget("today", -30, 0, 100), null);
  assert.equal(swipeTarget("today", -100, 120, 100), null);
  assert.equal(swipeTarget("today", -100, 80, 100), null);
  assert.equal(swipeTarget("today", -100, 0, 1000), null);
});
