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

test("eight-habit limit counts active habits and never removes existing data", async () => {
  const { MAX_HABITS, canAddHabit } =
    await import("../src/scripts/habits/model.js");
  const state = {
    habits: Array.from({ length: MAX_HABITS }, (_, i) => ({
      id: String(i),
      order: i,
    })),
    days: {},
  };
  assert.equal(canAddHabit(state), false);
  state.habits[0].archived = true;
  assert.equal(canAddHabit(state), true);
  state.habits.push({ id: "extra", order: 9 });
  assert.equal(canAddHabit(state), false);
  assert.equal(state.habits.length, 9);
});

test("statistics count completions, archived habits and past misses, ignoring future dates", async () => {
  const { statistics } = await import("../src/scripts/habits/model.js");
  const walk = { id: "walk", name: "Walk", archived: true };
  const read = { id: "read", name: "Read" };
  const state = {
    habits: [walk, read],
    days: Object.fromEntries(
      [
        ["2026-10-31", ["walk"]],
        ["2026-11-01", ["walk", "read"]],
        ["2026-11-02", ["walk"]],
        ["2026-11-03", []],
        ["2026-12-01", ["walk", "read"]],
      ].map(([date, completed]) => [
        date,
        { date, habits: [walk, read], completed },
      ]),
    ),
  };
  const stats = statistics(state, "2026-11-03");
  assert.equal(stats.total, 8);
  assert.equal(stats.completed, 4);
  assert.equal(stats.percent, 50);
  assert.equal(stats.perfectDays, 1);
  assert.equal(stats.longest.name, "Walk");
  assert.equal(stats.longest.longest, 3);
  assert.equal(stats.forgotten.name, "Read");
  assert.equal(stats.forgotten.missed, 2);
});

test("streaks break over missing dates and unscheduled days", async () => {
  const { statistics } = await import("../src/scripts/habits/model.js");
  const state = {
    habits: [habit],
    days: Object.fromEntries(
      [
        ["2026-11-01", [habit]],
        ["2026-11-03", [habit]],
        ["2026-11-04", []],
        ["2026-11-05", [habit]],
      ].map(([date, habits]) => [
        date,
        { date, habits, completed: [habit.id] },
      ]),
    ),
  };
  const stats = statistics(state, "2026-11-05");
  assert.equal(stats.longest.longest, 1);
  assert.equal(stats.forgotten, undefined);
  assert.equal(statistics({ habits: [], days: {} }, "2026-11-05").percent, 0);
});

test("habit insight sorting ranks completion, streaks and past misses without changing source data", async () => {
  const { sortHabitMetrics } = await import("../src/scripts/habits/model.js");
  const habits = [
    { name: "Walk", percent: 90, completed: 9, longest: 4, missed: 1 },
    { name: "Read", percent: 50, completed: 20, longest: 12, missed: 20 },
    { name: "Stretch", percent: 30, completed: 3, longest: 2, missed: 7 },
  ];
  assert.equal(sortHabitMetrics(habits, "complete")[0].name, "Walk");
  assert.equal(sortHabitMetrics(habits, "streak")[0].name, "Read");
  assert.equal(sortHabitMetrics(habits, "attention")[0].name, "Read");
  const ordered = habits.map((h, i) => ({ ...h, id: String(i) }));
  assert.deepEqual(
    sortHabitMetrics(ordered, "order", ["2", "0", "1"]).map((h) => h.name),
    ["Stretch", "Walk", "Read"],
  );
  assert.equal(habits[0].name, "Walk");
  assert.deepEqual(sortHabitMetrics([], "complete"), []);
});
