import Sortable from "sortablejs";

(() => {
  const DB_NAME = "daily-scorecard";
  const DB_VERSION = 1;
  const STORE = "app";
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  let state = { habits: [], days: {} };
  let screen = "today";
  let showLabels = false;
  let db;
  let toastTimer;

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const dateLabel = (key, options = { weekday:"short", month:"short", day:"numeric" }) =>
    new Date(`${key}T12:00:00`).toLocaleDateString(undefined, options);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => { db = request.result; resolve(db); };
      request.onerror = () => reject(request.error);
    });
  }
  function dbGet(key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function dbSet(key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  async function persist() {
    try {
      if (db) await dbSet("state", state);
      else localStorage.setItem(DB_NAME, JSON.stringify(state));
    } catch (e) { notify("Couldn't save changes. Check browser storage settings."); }
  }
  async function load() {
    try {
      await openDB();
      state = (await dbGet("state")) || { habits: [], days: {} };
    } catch (e) {
      try { state = JSON.parse(localStorage.getItem(DB_NAME)) || { habits: [], days: {} }; }
      catch (_) { state = { habits: [], days: {} }; }
    }
    state.habits ||= [];
    state.days ||= {};
    ensureToday();
  }
  function ensureToday() {
    const key = todayKey();
    // Backfill dates the app was not opened. They count as missed days, not as
    // days that silently disappear from the history. Use the last known list.
    const existingDates = Object.keys(state.days).sort();
    if (existingDates.length) {
      const lastDate = existingDates[existingDates.length - 1];
      const lastRecord = state.days[lastDate];
      const cursor = new Date(`${lastDate}T12:00:00`);
      cursor.setDate(cursor.getDate() + 1);
      while (cursor < new Date(`${key}T12:00:00`)) {
        const missingKey = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
        state.days[missingKey] = {
          date: missingKey,
          habits: (lastRecord.habits || []).map(h => ({ ...h })),
          completed: []
        };
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    if (!state.days[key]) {
      state.days[key] = {
        date: key,
        habits: state.habits.filter(h => !h.archived).map(h => ({ id:h.id, name:h.name })),
        completed: []
      };
      persist();
    }
  }
  function notify(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2100);
  }
  function setScreen(next) {
    screen = next;
    document.querySelectorAll(".nav button").forEach(b => {
      if (b.dataset.screen === screen) b.setAttribute("aria-current","page");
      else b.removeAttribute("aria-current");
    });
    render();
  }
  function activeHabits() { return state.habits.filter(h => !h.archived).sort((a,b) => a.order-b.order); }
  function currentDay() { ensureToday(); return state.days[todayKey()]; }
  function syncTodayHabits() {
    const day = currentDay();
    day.habits = activeHabits().map(h => ({ id:h.id, name:h.name }));
    day.completed = day.completed.filter(id => day.habits.some(h => h.id === id));
    persist();
  }
  function render() {
    document.getElementById("header-date").textContent = new Date().toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});
    if (!state.habits.length) { renderSetup(true); return; }
    if (screen === "today") renderToday();
    if (screen === "history") renderHistory();
    if (screen === "stats") renderStats();
    if (screen === "setup") renderSetup(false);
  }
  function renderToday() {
    const day = currentDay();
    const habits = day.habits || [];
    const done = new Set(day.completed || []);
    const count = habits.filter(h => done.has(h.id)).length;
    const allDone = habits.length > 0 && count === habits.length;
    app.innerHTML = `
      <section class="screen">
        <div class="screen-head">
          <h1>${dateLabel(todayKey(),{weekday:"long",month:"short",day:"numeric"})}</h1></div>
        </div>
        ${habits.length ? `
          <div class="score-card">
            <div class="bubble-list">
              ${habits.map((h,i)=>`
                <div class="habit-row">
                  <button class="bubble ${done.has(h.id)?"done":""}" data-toggle="${escapeHtml(h.id)}" aria-label="${done.has(h.id)?"Mark incomplete":"Mark complete"}: ${escapeHtml(h.name)}" aria-pressed="${done.has(h.id)}">
                    ${done.has(h.id)?'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':""}
                  </button>
                  <span class="habit-name" style="${showLabels ? "" : "visibility:hidden"}">${escapeHtml(h.name)}</span>
                </div>`).join("")}
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <button class="text-button" id="help-toggle">${showLabels?"?":"?"}</button>
          </div>
          ${allDone ? `` : ""}
        ` : `<div class="score-card empty-state"><h2>No habits yet.</h2><button class="primary" id="go-setup">Add habits</button></div>`}
      </section>`;
    app.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => toggleHabit(btn.dataset.toggle)));
    document.getElementById("help-toggle")?.addEventListener("click",()=>{showLabels=!showLabels;renderToday();});
    document.getElementById("edit-habits")?.addEventListener("click",()=>setScreen("setup"));
    document.getElementById("go-setup")?.addEventListener("click",()=>setScreen("setup"));
  }
  async function toggleHabit(id) {
    const day = currentDay();
    const set = new Set(day.completed);
    set.has(id) ? set.delete(id) : set.add(id);
    day.completed = [...set];
    await persist();
    renderToday();
  }
  function renderHistory() {
    const records = Object.values(state.days).filter(d=>d.habits?.length).sort((a,b)=>b.date.localeCompare(a.date));
    if (!records.length) { app.innerHTML = `<section class="screen"><p class="eyebrow">YOUR RECORD</p><h1>History</h1><p class="subtle">Your completed days will appear here.</p></section>`; return; }
    const columns = records[0].habits || [];
    const head = `<div class="history-row header" style="--habit-count:${columns.length}"><span class="history-date">DATE</span>${columns.map((h,i)=>`<span class="history-dot">${i+1}</span>`).join("")}</div>`;
    const rows = records.map(d=>{
      const ids = new Set(d.completed||[]);
      return `<div class="history-row ${d.date===todayKey()?"today":""}" style="--habit-count:${(d.habits||[]).length}">
        <span class="history-date">${dateLabel(d.date,{month:"short",day:"numeric",year:"2-digit"})}</span>
        ${(d.habits||[]).map(h=>`<span class="history-dot ${ids.has(h.id)?"done":""}" title="${escapeHtml(h.name)}"></span>`).join("")}
      </div>`;
    }).join("");
    app.innerHTML = `<section class="screen">
      <div class="screen-head"><div><p class="eyebrow">LOOKING BACK</p><h1>History</h1></div><span class="progress-pill">${records.length} DAYS</span></div>
      <div class="history-card"><div class="history-scroll"><div class="history-grid">${head}${rows}</div></div>
      <div class="history-legend"><span class="legend-item"><i class="legend-dot filled"></i> COMPLETE</span><span class="legend-item"><i class="legend-dot"></i> NOT COMPLETED</span></div></div>
      <p class="subtle" style="margin-top:13px">Scroll down to move back through your daily scorecards.</p>
    </section>`;
  }
  function habitMetrics(habit) {
    const records = Object.values(state.days).filter(d=>(d.habits||[]).some(h=>h.id===habit.id)).sort((a,b)=>a.date.localeCompare(b.date));
    const completed = records.filter(d=>(d.completed||[]).includes(habit.id)).length;
    let longest=0, run=0, previous=null;
    for (const d of records) {
      const date = new Date(`${d.date}T12:00:00`);
      const gap = previous ? Math.round((date-previous)/86400000) : 1;
      if (gap !== 1) run=0;
      if ((d.completed||[]).includes(habit.id)) { run++; longest=Math.max(longest,run); }
      else run=0;
      previous=date;
    }
    let current=0;
    const byDate = new Map(records.map(d=>[d.date,d]));
    const cursor = new Date(`${todayKey()}T12:00:00`);
    // A streak can start yesterday if today's habit has not yet been completed.
    if (!byDate.get(todayKey()) || !(byDate.get(todayKey()).completed||[]).includes(habit.id)) cursor.setDate(cursor.getDate()-1);
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
      const record = byDate.get(key);
      if (!record || !(record.completed||[]).includes(habit.id)) break;
      current++; cursor.setDate(cursor.getDate()-1);
    }
    return { total:records.length, completed, percent:records.length?Math.round(completed/records.length*100):0, longest, current };
  }
  function renderStats() {
    const habits = activeHabits();
    const allRecords = Object.values(state.days).filter(d=>d.habits?.length);
    const totalSlots = allRecords.reduce((n,d)=>n+(d.habits||[]).length,0);
    const totalDone = allRecords.reduce((n,d)=>n+(d.completed||[]).length,0);
    const overall = totalSlots ? Math.round(totalDone/totalSlots*100) : 0;
    const metrics = habits.map(h=>({habit:h,...habitMetrics(h)}));
    const sorted = [...metrics].sort((a,b)=>a.percent-b.percent);
    const best = [...metrics].sort((a,b)=>b.percent-a.percent)[0];
    const weakest = sorted[0];
    const longest = [...metrics].sort((a,b)=>b.longest-a.longest)[0];
    app.innerHTML = `<section class="screen" style="display: flex;">  
    <h2 style="text-align: center;"> coming soon! </h2>
    </section>`;
  }
  function renderSetup(firstRun) {
    const habits = activeHabits();
    app.innerHTML = `<section class="screen">
      <div class="setup-list">
        ${habits.map((h,i)=>`<div class="setup-row" data-id="${escapeHtml(h.id)}">
          <span class="setup-index">${String(i+1).padStart(2,"0")}</span>
          <input class="setup-name" aria-label="Habit name" value="${escapeHtml(h.name)}" maxlength="48" data-rename="${escapeHtml(h.id)}" />
          <div class="row-actions">
            <button class="icon-button" data-move="-1" data-id="${escapeHtml(h.id)}" aria-label="Move up" ${i===0?"disabled":""}>↑</button>
            <button class="icon-button" data-move="1" data-id="${escapeHtml(h.id)}" aria-label="Move down" ${i===habits.length-1?"disabled":""}>↓</button>
            <button class="icon-button" data-archive="${escapeHtml(h.id)}" aria-label="Archive habit">×</button>
          </div>
        </div>`).join("")}
      </div>
      <div class="input-line" style="display:flex; justify-content: center; align-items: center; margin-top: 20px;">
        <form class="add-row" id="add-form"><input id="new-habit" maxlength="48" placeholder="New habits here" aria-label="New habit name" style="width: 50%; margin: 0 auto; border-radius: 100px; padding: 10px; border: none; background-color: #E9EAE2;"/><button class="primary" type="submit" style="width: 40px; height: 40px; margin-left: 3%; border-radius: 50%; padding: 10px; border: none; background-color: #E9EAE2; color: black;">+</button></form>
      </div>
    </section>`;
    app.querySelector("#add-form")?.addEventListener("submit", async e=>{
      e.preventDefault(); const input=app.querySelector("#new-habit"); const name=input.value.trim();
      if (!name) return;
      state.habits.push({id:uid(),name,order:state.habits.length,archived:false});
      syncTodayHabits(); await persist(); renderSetup(firstRun);
      app.querySelector("#new-habit")?.focus();
    });
    app.querySelectorAll("[data-rename]").forEach(input=>input.addEventListener("change",async()=>{
      const h=state.habits.find(x=>x.id===input.dataset.rename); const name=input.value.trim();
      if (!name) { input.value=h.name; return; }
      h.name=name; syncTodayHabits(); await persist(); notify("Habit updated.");
    }));
    app.querySelectorAll("[data-move]").forEach(btn=>btn.addEventListener("click",async()=>{
      const list=activeHabits(); const index=list.findIndex(h=>h.id===btn.dataset.id); const target=index+Number(btn.dataset.move);
      if (target<0||target>=list.length) return;
      [list[index].order,list[target].order]=[list[target].order,list[index].order];
      syncTodayHabits(); await persist(); renderSetup(firstRun);
    }));
    app.querySelectorAll("[data-archive]").forEach(btn=>btn.addEventListener("click",async()=>{
      const h=state.habits.find(x=>x.id===btn.dataset.archive);
      if (!confirm(`Archive "${h.name}"? It will remain in past records.`)) return;
      h.archived=true; syncTodayHabits(); await persist(); renderSetup(firstRun); notify("Habit archived.");
    }));
    app.querySelector("#start-app")?.addEventListener("click",()=>setScreen("today"));
    app.querySelector("#back-today")?.addEventListener("click",()=>setScreen("today"));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`daymark-backup-${todayKey()}.json`; a.click(); URL.revokeObjectURL(url);
    notify("Backup exported.");
  }
  async function importData(event) {
    const file=event.target.files?.[0]; if (!file) return;
    try {
      const parsed=JSON.parse(await file.text());
      if (!Array.isArray(parsed.habits)||typeof parsed.days!=="object"||!parsed.days) throw new Error("Invalid backup");
      if (!confirm("Replace the habits and history on this device with this backup?")) return;
      state=parsed; ensureToday(); await persist(); notify("Backup imported."); render();
    } catch(e) { notify("That file doesn't look like a Daymark backup."); }
    event.target.value="";
  }
  document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>setScreen(b.dataset.screen)));
  load().then(()=>{
    if (!state.habits.length) screen="setup";
    document.querySelectorAll(".nav button").forEach(b=>{
      if(b.dataset.screen===screen)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    });
    render();
  });
  // If the app is left open across midnight, prepare the new day's empty scorecard.
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){ensureToday();render();}});
})();