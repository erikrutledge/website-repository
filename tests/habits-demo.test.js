import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../src/scripts/habits/demo.js";

test("demo fills eight weeks with varied repeatable completions without modifying real data", () => {
  const saved = {
    habits: [
      { id: "walk", name: "Walk", order: 0 },
      { id: "read", name: "Read", order: 1 },
      { id: "stretch", name: "Stretch", order: 2 },
      { id: "archived", name: "Old habit", order: 3, archived: true },
    ],
    days: { "2026-11-07": { date: "2026-11-07", habits: [], completed: [] } },
  };
  const before = structuredClone(saved);
  const today = new Date(2026, 10, 7);
  const demo = createDemoState(saved, today);
  assert.equal(Object.keys(demo.days).length, 56);
  assert.ok(demo.days["2026-11-07"]);
  assert.ok(demo.days["2026-09-13"]);
  assert.deepEqual(
    demo.habits.map((h) => h.name),
    ["Walk", "Read", "Stretch"],
  );
  const counts = demo.habits.map(
    (h) =>
      Object.values(demo.days).filter((day) => day.completed.includes(h.id))
        .length,
  );
  assert.ok(counts[0] > counts[2]);
  assert.deepEqual(createDemoState(saved, today), demo);
  demo.habits[0].name = "Changed in demo";
  demo.days["2026-11-07"].completed.push("new");
  assert.deepEqual(saved, before);
});

test("fresh browsers have sample habits for screenshots", () => {
  const demo = createDemoState({ habits: [], days: {} });
  assert.equal(demo.habits.length, 6);
  assert.ok(Object.values(demo.days).every((day) => day.habits.length === 6));
});
