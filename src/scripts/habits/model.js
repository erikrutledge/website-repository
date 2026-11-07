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
