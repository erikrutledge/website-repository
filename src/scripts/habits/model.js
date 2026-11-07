// Keep IDs, archived habits, and historical snapshots compatible with existing data.
export const emptyState = () => ({ habits: [], days: {} });

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function activeHabits(state) {
  return state.habits
    .filter((h) => !h.archived)
    .sort((a, b) => a.order - b.order);
}

export function ensureDay(state, key) {
  let changed = false;
  const previousKey = Object.keys(state.days)
    .filter((date) => date < key)
    .sort()
    .at(-1);
  if (previousKey) {
    const previous = state.days[previousKey];
    const cursor = new Date(`${previousKey}T12:00:00`);
    cursor.setDate(cursor.getDate() + 1);
    while (dateKey(cursor) < key) {
      const missingKey = dateKey(cursor);
      if (!state.days[missingKey]) {
        state.days[missingKey] = {
          date: missingKey,
          habits: previous.habits.map((h) => ({ ...h })),
          completed: [],
        };
        changed = true;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  if (!state.days[key]) {
    state.days[key] = {
      date: key,
      habits: activeHabits(state).map(({ id, name }) => ({ id, name })),
      completed: [],
    };
    changed = true;
  }
  return changed;
}

export const MAX_HABITS = 8;
export const canAddHabit = (state) => activeHabits(state).length < MAX_HABITS;

export function statistics(state, today) {
  const records = Object.values(state.days)
    .filter((day) => day.date <= today && day.habits.length)
    .sort((a, b) => a.date.localeCompare(b.date));
  const metrics = new Map(
    state.habits.map((h) => [
      h.id,
      {
        id: h.id,
        name: h.name,
        total: 0,
        completed: 0,
        missed: 0,
        longest: 0,
        run: 0,
        previous: null,
      },
    ]),
  );
  let total = 0,
    completed = 0,
    perfectDays = 0;
  for (const day of records) {
    const ordinal = Date.parse(`${day.date}T00:00:00Z`) / 86400000;
    const done = new Set(day.completed);
    if (day.habits.every((h) => done.has(h.id))) perfectDays++;
    for (const habit of day.habits) {
      if (!metrics.has(habit.id))
        metrics.set(habit.id, {
          id: habit.id,
          name: habit.name,
          total: 0,
          completed: 0,
          missed: 0,
          longest: 0,
          run: 0,
          previous: null,
        });
      const metric = metrics.get(habit.id);
      const isDone = done.has(habit.id);
      metric.total++;
      total++;
      if (isDone) {
        metric.completed++;
        completed++;
      } else if (day.date < today) metric.missed++;
      metric.run = isDone
        ? metric.previous === ordinal - 1
          ? metric.run + 1
          : 1
        : 0;
      metric.longest = Math.max(metric.longest, metric.run);
      metric.previous = ordinal;
    }
  }
  const habits = [...metrics.values()]
    .filter((h) => h.total)
    .map((h) => ({
      ...h,
      percent: Math.round((h.completed / h.total) * 100),
    }));
  return {
    habits,
    total,
    completed,
    perfectDays,
    percent: total ? Math.round((completed / total) * 100) : 0,
    longest: [...habits].sort((a, b) => b.longest - a.longest)[0],
    forgotten: [...habits]
      .filter((h) => h.missed > 0)
      .sort((a, b) => b.missed - a.missed)[0],
  };
}

export function sortHabitMetrics(habits, sort, orderedIds = []) {
  const ranks = new Map(orderedIds.map((id, index) => [id, index]));
  const compare =
    {
      complete: (a, b) => b.percent - a.percent || b.completed - a.completed,
      streak: (a, b) => b.longest - a.longest || b.percent - a.percent,
      attention: (a, b) => b.missed - a.missed || a.percent - b.percent,
      order: (a, b) =>
        (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity),
    }[sort] || ((a, b) => b.percent - a.percent);
  return [...habits].sort(compare);
}
