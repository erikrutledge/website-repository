import test from "node:test";
import assert from "node:assert/strict";
import {
  activeHabits,
  dateKey,
  ensureDay,
} from "../src/scripts/habits/model.js";

const habit = { id: "walk", name: "Walk", order: 1, archived: false };

test("new days use ordered active habits and preserve historical snapshots", () => {
  const state = {
    habits: [
      habit,
      { id: "read", name: "Read", order: 0 },
      { id: "old", archived: true },
    ],
    days: {
      "2026-10-31": {
        date: "2026-10-31",
        habits: [{ id: "walk", name: "Old name" }],
        completed: ["walk"],
      },
    },
  };
  assert.equal(ensureDay(state, "2026-11-03"), true);
  assert.deepEqual(state.days["2026-11-01"].habits, [
    { id: "walk", name: "Old name" },
  ]);
  assert.deepEqual(state.days["2026-11-02"].completed, []);
  assert.deepEqual(
    state.days["2026-11-03"].habits.map((h) => h.id),
    ["read", "walk"],
  );
  assert.deepEqual(state.days["2026-10-31"].completed, ["walk"]);
  assert.equal(ensureDay(state, "2026-11-03"), false);
  state.habits[0].name = "Renamed";
  assert.equal(state.days["2026-11-03"].habits[1].name, "Walk");
});

test("backfill ignores future records and keeps existing completions", () => {
  const state = {
    habits: [habit],
    days: {
      "2026-11-01": {
        date: "2026-11-01",
        habits: [habit],
        completed: ["walk"],
      },
      "2026-12-01": { date: "2026-12-01", habits: [], completed: [] },
    },
  };
  ensureDay(state, "2026-11-03");
  assert.ok(state.days["2026-11-02"]);
  state.days["2026-11-03"].completed.push("walk");
  ensureDay(state, "2026-11-03");
  assert.deepEqual(state.days["2026-11-03"].completed, ["walk"]);
});

test("local date keys and sorting do not mutate stored habit order", () => {
  assert.equal(dateKey(new Date(2026, 0, 2, 0)), "2026-01-02");
  const state = { habits: [habit, { id: "first", order: 0 }], days: {} };
  assert.equal(activeHabits(state)[0].id, "first");
  assert.equal(state.habits[0].id, "walk");
});
