import {
  activeHabits,
  dateKey,
  ensureDay,
  MAX_HABITS,
  canAddHabit,
  statistics,
  sortHabitMetrics,
} from "./model.js";
import { loadState, saveState } from "./storage.js";
import { setupTutorial } from "./tutorial.js";
import { createDemoState } from "./demo.js";
import { SCREENS, setupSwipes } from "./swipe.js";

(() => {
  const demo = new URLSearchParams(window.location.search).get("demo") === "1";
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  let state = { habits: [], days: {} };
  let screen = "today";
  let showLabels = false;
  let habitSort = "order";
  const sortOptions = [
    { value: "order", label: "Your order" },
    { value: "complete", label: "Most complete" },
    { value: "streak", label: "Longest streak" },
    { value: "attention", label: "Needs attention" },
  ];
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
    if (demo) return;
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
  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let screenAnimation;
  function setScreen(next) {
    const changed = next !== screen;
    const direction = SCREENS.indexOf(next) >= SCREENS.indexOf(screen) ? 1 : -1;
    screen = next;
    document.querySelectorAll(".nav button").forEach((b) => {
      if (b.dataset.screen === screen) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document
      .querySelector(".nav")
      .style.setProperty("--tab", String(SCREENS.indexOf(screen)));
    screenAnimation?.cancel();
    render();
    if (changed && !reducedMotion()) {
      screenAnimation = app.animate(
        [
          { opacity: 0, transform: `translateX(${direction * 12}px)` },
          { opacity: 1, transform: "translateX(0)" },
        ],
        { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    }
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
    document.getElementById("settings-footer").hidden = screen !== "setup";
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
    const count = habits.filter((h) => done.has(h.id)).length;
    app.innerHTML = `
      <section class="screen">
        <div class="screen-head"><div><p class="eyebrow">ONE DAY AT A TIME</p><h1>Today</h1></div><span class="progress-pill" id="daily-progress" role="status">${count} / ${habits.length}</span></div>
        ${
          habits.length
            ? `
          <div class="history-card daily-card">
            <div class="daily-caption"><span class="history-date">${dateLabel(todayKey(), { weekday: "short", month: "short", day: "numeric" })}</span><span class="eyebrow">DAILY SCORECARD</span></div>
            <div class="score-scroll"><div class="bubble-list" style="--count:${habits.length}">
              ${habits
                .map(
                  (h, i) => `<div class="habit-cell">
                <span class="habit-index">${String(i + 1).padStart(2, "0")}</span>
                <button class="bubble ${done.has(h.id) ? "done" : ""}" data-toggle="${escapeHtml(h.id)}" aria-label="${done.has(h.id) ? "Mark incomplete" : "Mark complete"}: ${escapeHtml(h.name)}" aria-pressed="${done.has(h.id)}"><span aria-hidden="true">✓</span></button>
                </div>`,
                )
                .join("")}
            </div></div>
            <div class="daily-bottom"><span id="daily-summary">${count === habits.length ? "A little progress, all done." : "Small steps. Every day."}</span><button class="help-button" id="help-toggle" aria-label="Show or hide habit names" aria-expanded="${showLabels}" aria-controls="habit-labels">?</button></div>
            <ol class="habit-labels" id="habit-labels" ${showLabels ? "" : "hidden"}>${habits.map((h, i) => `<li><span>${String(i + 1).padStart(2, "0")}</span>${escapeHtml(h.name)}</li>`).join("")}</ol>
          </div>
        `
            : `<div class="history-card empty-state"><h2>A fresh start.</h2><p class="subtle">Choose up to eight small habits to return to each day.</p><button class="primary" id="go-setup">Add habits</button></div>`
        }
      </section>`;
    app
      .querySelectorAll("[data-toggle]")
      .forEach((btn) =>
        btn.addEventListener("click", () => toggleHabit(btn.dataset.toggle)),
      );
    document.getElementById("help-toggle")?.addEventListener("click", () => {
      showLabels = !showLabels;
      const labels = document.getElementById("habit-labels");
      labels.hidden = !showLabels;
      document
        .getElementById("help-toggle")
        .setAttribute("aria-expanded", String(showLabels));
    });
    document
      .getElementById("go-setup")
      ?.addEventListener("click", () => setScreen("setup"));
  }
  function celebrateDay() {
    if (reducedMotion()) return;
    const card = app.querySelector(".daily-card");
    if (!card) return;
    card.querySelector(".fireworks")?.remove();
    const layer = document.createElement("div");
    layer.className = "fireworks";
    layer.setAttribute("aria-hidden", "true");
    for (let burst = 0; burst < 3; burst++) {
      for (let ray = 0; ray < 10; ray++) {
        const spark = document.createElement("span");
        const angle = (ray / 10) * Math.PI * 2;
        spark.className = "firework-spark";
        spark.style.left = `${22 + burst * 28}%`;
        spark.style.top = `${30 + (burst % 2) * 16}%`;
        spark.style.setProperty("--dx", `${Math.cos(angle) * 44}px`);
        spark.style.setProperty("--dy", `${Math.sin(angle) * 36}px`);
        spark.style.setProperty("--delay", `${burst * 120}ms`);
        spark.style.setProperty(
          "--spark-color",
          ["#687c59", "#b58a41", "#a67c77"][ray % 3],
        );
        layer.append(spark);
      }
    }
    card.append(layer);
    setTimeout(() => layer.remove(), 1200);
  }
  async function toggleHabit(id) {
    const day = currentDay();
    const wasComplete = day.habits.every((h) => day.completed.includes(h.id));
    const set = new Set(day.completed);
    set.has(id) ? set.delete(id) : set.add(id);
    day.completed = [...set];
    const button = [...app.querySelectorAll("[data-toggle]")].find(
      (b) => b.dataset.toggle === id,
    );
    button?.classList.toggle("done", set.has(id));
    button?.setAttribute("aria-pressed", String(set.has(id)));
    const habit = day.habits.find((h) => h.id === id);
    button?.setAttribute(
      "aria-label",
      `${set.has(id) ? "Mark incomplete" : "Mark complete"}: ${habit.name}`,
    );
    const count = day.habits.filter((h) => set.has(h.id)).length;
    document.getElementById("daily-progress").textContent =
      `${count} / ${day.habits.length}`;
    document.getElementById("daily-summary").textContent =
      count === day.habits.length
        ? "A little progress, all done."
        : "Small steps. Every day.";
    if (!wasComplete && count === day.habits.length) celebrateDay();
    await persist();
  }
  function renderHistory() {
    const records = Object.values(state.days)
      .filter((d) => d.habits?.length)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!records.length) {
      app.innerHTML = `<section class="screen"><p class="eyebrow">YOUR RECORD</p><h1 class="history-title">Past at a Glance</h1><p class="subtle">Your completed days will appear here.</p></section>`;
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
      <div class="screen-head"><div><p class="eyebrow">LOOKING BACK</p><h1 class="history-title">Past at a Glance</h1></div><span class="progress-pill">${records.length} DAYS</span></div>
      <div class="history-card"><div class="history-scroll"><div class="history-grid">${head}${rows}</div></div>
      <div class="history-legend"><span class="legend-item"><i class="legend-dot filled"></i> COMPLETE</span><span class="legend-item"><i class="legend-dot"></i> NOT COMPLETED</span></div></div>
    </section>`;
  }
  function renderStats() {
    const stats = statistics(state, todayKey());
    const day = currentDay();
    const completedToday = day.habits.filter((h) =>
      day.completed.includes(h.id),
    ).length;
    const allDone =
      day.habits.length > 0 && completedToday === day.habits.length;
    const rows = () =>
      sortHabitMetrics(
        stats.habits,
        habitSort,
        activeHabits(state).map((h) => h.id),
      )
        .map(
          (h) =>
            `<div class="performance-row"><div class="performance-top"><span>${escapeHtml(h.name)}</span><span class="history-date">${h.percent}%</span></div><div class="bar"><span style="width:${h.percent}%"></span></div><p class="subtle">${h.completed} / ${h.total} check-ins · best streak ${h.longest}d · ${h.missed} missed day${h.missed === 1 ? "" : "s"}</p></div>`,
        )
        .join("");
    app.innerHTML = `<section class="screen">
      <div class="screen-head"><div><p class="eyebrow">THE BIGGER PICTURE</p><h1>Insights</h1></div><span class="progress-pill">ALL TIME</span></div>
      ${
        stats.total
          ? `<div class="stat-card today-progress ${allDone ? "celebration" : ""}">
        <p class="eyebrow">TODAY'S SMALL WINS</p><div class="stat-value">${completedToday}<small> / ${day.habits.length}</small></div>
        <h2>${allDone ? "You showed up. You did it!" : day.habits.length ? (completedToday ? "Look at you making progress." : "Your next small win is waiting.") : "Make room for a small win."}</h2>
        <p class="subtle">${allDone ? "Every habit checked off. Take a moment to enjoy it—you earned this." : day.habits.length ? `${day.habits.length - completedToday} more to go. One small step is enough to get moving.` : "Choose one habit to start your day."}</p>
        ${allDone ? '<span class="celebration-note">✓ All done for today</span>' : `<button class="primary" id="return-to-tasks">${day.habits.length ? "Back to today's habits →" : "Choose a habit →"}</button>`}
      </div>
      <div class="history-card insights">
        <div class="insight"><p class="eyebrow">PERFECT DAYS</p><h2>${stats.perfectDays}</h2><p class="subtle">Days you checked off every habit</p></div>
        <div class="insight"><p class="eyebrow">LONGEST STREAK</p><h2 class="insight-name">${stats.longest?.longest ? escapeHtml(stats.longest.name) : "Your first streak awaits"}</h2><p class="subtle">${stats.longest?.longest || 0} consecutive day${stats.longest?.longest === 1 ? "" : "s"}</p></div>
        <div class="insight"><p class="eyebrow">MOST FORGOTTEN</p><h2 class="insight-name">${stats.forgotten ? escapeHtml(stats.forgotten.name) : "A clean slate"}</h2><p class="subtle">${stats.forgotten ? `${stats.forgotten.missed} missed day${stats.forgotten.missed === 1 ? "" : "s"}` : "No missed habits on past days."}</p></div>
      </div>
      <div class="performance-heading"><h2 class="section-title">Habit by habit</h2><button class="sort-button" id="habit-sort" type="button" aria-controls="habit-performance"><span id="habit-sort-label" aria-live="polite">${sortOptions.find((option) => option.value === habitSort).label}</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg></button></div><div class="history-card performance-list" id="habit-performance">${rows()}</div>

      `
          : `<div class="history-card empty-state"><h2>It starts with one day.</h2><p class="subtle">Add a habit and your progress will appear here.</p></div>`
      }
    </section>`;
    app
      .querySelector("#return-to-tasks")
      ?.addEventListener("click", () =>
        setScreen(day.habits.length ? "today" : "setup"),
      );
    const sort = app.querySelector("#habit-sort");
    if (sort) {
      const updateSortLabel = () => {
        const index = sortOptions.findIndex(
          (option) => option.value === habitSort,
        );
        const current = sortOptions[index];
        const next = sortOptions[(index + 1) % sortOptions.length];
        document.getElementById("habit-sort-label").textContent = current.label;
        sort.setAttribute(
          "aria-label",
          `Sort: ${current.label}. Switch to ${next.label}`,
        );
        sort.title = `Switch to ${next.label}`;
      };
      updateSortLabel();
      sort.addEventListener("click", () => {
        const index = sortOptions.findIndex(
          (option) => option.value === habitSort,
        );
        habitSort = sortOptions[(index + 1) % sortOptions.length].value;
        updateSortLabel();
        document.getElementById("habit-performance").innerHTML = rows();
      });
    }
  }
  function renderSetup() {
    const habits = activeHabits(state);
    app.innerHTML = `<section class="screen">
      <div class="screen-head"><div><p class="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h1>Your habits</h1></div><span class="progress-pill">${habits.length} / ${MAX_HABITS}</span></div>
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
      ${
        canAddHabit(state)
          ? `<div class="input-line">
        <form class="add-row" id="add-form"><input id="new-habit" maxlength="48" placeholder="New habit" aria-label="New habit name"/><button class="primary" type="submit" aria-label="Add habit">+</button></form>
      </div>`
          : ""
      }
    </section>`;
    app.querySelector("#add-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = app.querySelector("#new-habit");
      const name = input.value.trim();
      if (!name || !canAddHabit(state)) return;
      state.habits.push({
        id: uid(),
        name,
        order: state.habits.length,
        archived: false,
      });
      syncTodayHabits();
      await persist();
      if (screen === "setup") renderSetup();
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
        const positions = new Map(
          [...app.querySelectorAll(".setup-row")].map((row) => [
            row.dataset.id,
            row.getBoundingClientRect().top,
          ]),
        );
        [list[index].order, list[target].order] = [
          list[target].order,
          list[index].order,
        ];
        syncTodayHabits();
        renderSetup();
        if (!reducedMotion())
          app.querySelectorAll(".setup-row").forEach((row) => {
            const offset =
              positions.get(row.dataset.id) - row.getBoundingClientRect().top;
            if (offset)
              row.animate(
                [
                  { transform: `translateY(${offset}px)` },
                  { transform: "translateY(0)" },
                ],
                { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
              );
          });
        const moved = [...app.querySelectorAll("[data-move]")].find(
          (b) =>
            b.dataset.id === btn.dataset.id &&
            b.dataset.move === btn.dataset.move,
        );
        moved?.focus();
        await persist();
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
        if (screen === "setup") renderSetup();
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
    state = demo ? createDemoState(loaded) : loaded;
    if (demo) screen = "history";
    ensureToday();
    if (!state.habits.length) screen = "setup";
    setScreen(screen);
    setupTutorial({ setScreen, getScreen: () => screen, autoShow: !demo });
    setupSwipes(app, { getScreen: () => screen, setScreen });
    if (demo) notify("Example data · Your saved history is unchanged.");
  });
  // If the app is left open across midnight, prepare the new day's empty scorecard.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      ensureToday();
      render();
    }
  });
})();
