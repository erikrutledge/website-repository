import { activeHabits, dateKey } from "./model.js";

// Repeatable example data for screenshots; never writes to browser storage.
export function createDemoState(saved, today = new Date()) {
  const habits = activeHabits(saved).map((h) => ({ ...h }));
  if (!habits.length) {
    [
      "Read a page",
      "Take a walk",
      "Stretch",
      "Drink water",
      "Write a little",
      "Practice a skill",
    ].forEach((name, order) => {
      habits.push({ id: `demo-${order}`, name, order, archived: false });
    });
  }
  let seed = 87231;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const rates = [0.96, 0.84, 0.67, 0.9, 0.48, 0.76, 0.58, 0.88];
  const days = {};
  for (let ago = 55; ago >= 0; ago--) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - ago);
    const key = dateKey(date);
    days[key] = {
      date: key,
      habits: habits.map(({ id, name }) => ({ id, name })),
      completed: habits
        .filter((_, index) => random() < rates[index % rates.length])
        .map((h) => h.id),
    };
  }
  return { habits, days };
}
