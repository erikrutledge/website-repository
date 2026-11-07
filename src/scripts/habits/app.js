import { activeHabits, dateKey, ensureDay } from "./model.js";
import { loadState, saveState } from "./storage.js";

(() => {
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  let state = { habits: [], days: {} };
  let screen = "today";
  let showLabels = false;
  let toastTimer;

  const todayKey = () => dateKey(new Date());
  const dateLabel = (
    key,
    options = { weekday: "short", month: "short", day: "numeric" },
  ) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, options);
  const escapeHtml = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const uid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : `h-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  async function persist() {
    try {
      await saveState(state);
    } catch {
      notify("Couldn't save changes. Check browser storage settings.");
    }
  }
  function ensureToday() {
    if (ensureDay(state, todayKey())) persist();
  }
  function notify(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2100);
  }
  function setScreen(next) {
    screen = next;
    document.querySelectorAll(".nav button").forEach((b) => {
      if (b.dataset.screen === screen) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    render();
  }
  function currentDay() {
    ensureToday();
    return state.days[todayKey()];
  }
  function syncTodayHabits() {
    const day = currentDay();
    day.habits = activeHabits(state).map((h) => ({ id: h.id, name: h.name }));
    day.completed = day.completed.filter((id) =>
      day.habits.some((h) => h.id === id),
    );
  }
  function render() {
    ensureToday();
    document.getElementById("header-date").textContent =
      new Date().toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    if (screen === "today") renderToday();
    if (screen === "history") renderHistory();
    if (screen === "stats") renderStats();
    if (screen === "setup") renderSetup();
  }
  function renderToday() {
    const day = currentDay();
    const habits = day.habits || [];
    const done = new Set(day.completed || []);
    app.innerHTML = `
      <section class="screen">
        <div class="screen-head">
          <h1>${dateLabel(todayKey(), { weekday: "long", month: "short", day: "numeric" })}</h1>
        </div>
        ${
          habits.length
            ? `
          <div class="score-card">
            <div class="bubble-list">
              ${habits
                .map(
                  (h) => `
                <div class="habit-row">
                  <button class="bubble ${done.has(h.id) ? "done" : ""}" data-toggle="${escapeHtml(h.id)}" aria-label="${done.has(h.id) ? "Mark incomplete" : "Mark complete"}: ${escapeHtml(h.name)}" aria-pressed="${done.has(h.id)}">
                    ${done.has(h.id) ? '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}
                  </button>
                  <span class="habit-name" style="${showLabels ? "" : "visibility:hidden"}">${escapeHtml(h.name)}</span>
                </div>`,
                )
                .join("")}
            </div>
          </div>
          <div class="daily-actions">
            <button class="text-button" id="help-toggle">${showLabels ? "Hide habit names" : "Show habit names"}</button>
          </div>
        `
            : `<div class="score-card empty-state"><h2>No habits yet.</h2><button class="primary" id="go-setup">Add habits</button></div>`
        }
      </section>`;
    app
      .querySelectorAll("[data-toggle]")
      .forEach((btn) =>
        btn.addEventListener("click", () => toggleHabit(btn.dataset.toggle)),
      );
    document.getElementById("help-toggle")?.addEventListener("click", () => {
      showLabels = !showLabels;
      renderToday();
    });
    document
      .getElementById("go-setup")
      ?.addEventListener("click", () => setScreen("setup"));
  }
  async function toggleHabit(id) {
    const day = currentDay();
    const set = new Set(day.completed);
    set.has(id) ? set.delete(id) : set.add(id);
    day.completed = [...set];
    await persist();
    render();
  }
  function renderHistory() {
    const records = Object.values(state.days)
      .filter((d) => d.habits?.length)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!records.length) {
      app.innerHTML = `<section class="screen"><p class="eyebrow">YOUR RECORD</p><h1>History</h1><p class="subtle">Your completed days will appear here.</p></section>`;
      return;
    }
    const columns = records[0].habits || [];
    const head = `<div class="history-row header" style="--habit-count:${columns.length}"><span class="history-date">DATE</span>${columns.map((_, i) => `<span class="history-dot">${i + 1}</span>`).join("")}</div>`;
    const rows = records
      .map((d) => {
        const ids = new Set(d.completed || []);
        return `<div class="history-row ${d.date === todayKey() ? "today" : ""}" style="--habit-count:${(d.habits || []).length}">
        <span class="history-date">${dateLabel(d.date, { month: "short", day: "numeric", year: "2-digit" })}</span>
        ${(d.habits || []).map((h) => `<span class="history-dot ${ids.has(h.id) ? "done" : ""}" title="${escapeHtml(h.name)}"></span>`).join("")}
      </div>`;
      })
      .join("");
    app.innerHTML = `<section class="screen">
      <div class="screen-head"><div><p class="eyebrow">LOOKING BACK</p><h1>History</h1></div><span class="progress-pill">${records.length} DAYS</span></div>
      <div class="history-card"><div class="history-scroll"><div class="history-grid">${head}${rows}</div></div>
      <div class="history-legend"><span class="legend-item"><i class="legend-dot filled"></i> COMPLETE</span><span class="legend-item"><i class="legend-dot"></i> NOT COMPLETED</span></div></div>
      <p class="subtle" style="margin-top:13px">Scroll down to move back through your daily scorecards.</p>
    </section>`;
  }
  function renderStats() {
    app.innerHTML = '<section class="screen"><h2>coming soon!</h2></section>';
  }
  function renderSetup() {
    const habits = activeHabits(state);
    app.innerHTML = `<section class="screen">
      <div class="setup-list">
        ${habits
          .map(
            (h, i) => `<div class="setup-row" data-id="${escapeHtml(h.id)}">
          <span class="setup-index">${String(i + 1).padStart(2, "0")}</span>
          <input class="setup-name" aria-label="Habit name" value="${escapeHtml(h.name)}" maxlength="48" data-rename="${escapeHtml(h.id)}" />
          <div class="row-actions">
            <button class="icon-button" data-move="-1" data-id="${escapeHtml(h.id)}" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="icon-button" data-move="1" data-id="${escapeHtml(h.id)}" aria-label="Move down" ${i === habits.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon-button" data-archive="${escapeHtml(h.id)}" aria-label="Archive habit">×</button>
          </div>
        </div>`,
          )
          .join("")}
      </div>
      <div class="input-line">
        <form class="add-row" id="add-form"><input id="new-habit" maxlength="48" placeholder="New habits here" aria-label="New habit name"/><button class="primary" type="submit" aria-label="Add habit">+</button></form>
      </div>
    </section>`;
    app.querySelector("#add-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = app.querySelector("#new-habit");
      const name = input.value.trim();
      if (!name) return;
      state.habits.push({
        id: uid(),
        name,
        order: state.habits.length,
        archived: false,
      });
      syncTodayHabits();
      await persist();
      renderSetup();
      app.querySelector("#new-habit")?.focus();
    });
    app.querySelectorAll("[data-rename]").forEach((input) =>
      input.addEventListener("change", async () => {
        const h = state.habits.find((x) => x.id === input.dataset.rename);
        const name = input.value.trim();
        if (!name) {
          input.value = h.name;
          return;
        }
        h.name = name;
        syncTodayHabits();
        await persist();
        notify("Habit updated.");
      }),
    );
    app.querySelectorAll("[data-move]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const list = activeHabits(state);
        const index = list.findIndex((h) => h.id === btn.dataset.id);
        const target = index + Number(btn.dataset.move);
        if (target < 0 || target >= list.length) return;
        [list[index].order, list[target].order] = [
          list[target].order,
          list[index].order,
        ];
        syncTodayHabits();
        await persist();
        renderSetup();
      }),
    );
    app.querySelectorAll("[data-archive]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const h = state.habits.find((x) => x.id === btn.dataset.archive);
        if (!confirm(`Archive "${h.name}"? It will remain in past records.`))
          return;
        h.archived = true;
        syncTodayHabits();
        await persist();
        renderSetup();
        notify("Habit archived.");
      }),
    );
  }
  document
    .querySelectorAll(".nav button")
    .forEach((b) =>
      b.addEventListener("click", () => setScreen(b.dataset.screen)),
    );
  loadState().then((loaded) => {
    state = loaded;
    ensureToday();
    if (!state.habits.length) screen = "setup";
    document.querySelectorAll(".nav button").forEach((b) => {
      if (b.dataset.screen === screen) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    render();
  });
  // If the app is left open across midnight, prepare the new day's empty scorecard.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      ensureToday();
      render();
    }
  });
})();
