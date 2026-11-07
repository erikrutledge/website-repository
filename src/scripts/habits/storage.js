import { emptyState } from "./model.js";

// Preserve the original database, store, and key so existing users retain data.
const NAME = "daily-scorecard";
let database;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("app");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readState() {
  return new Promise((resolve, reject) => {
    const request = database.transaction("app").objectStore("app").get("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState() {
  let state;
  try {
    database = await openDatabase();
    state = await readState();
  } catch {
    database = undefined;
  }
  // Also recover fallback data when IndexedDB becomes available again.
  if (!state) {
    try {
      state = JSON.parse(localStorage.getItem(NAME));
    } catch {
      /* A new scorecard can still work when storage is unavailable. */
    }
  }
  state ||= emptyState();
  state.habits ||= [];
  state.days ||= {};
  return state;
}

export async function saveState(state) {
  if (!database) {
    localStorage.setItem(NAME, JSON.stringify(state));
    return;
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("app", "readwrite");
    transaction.objectStore("app").put(state, "state");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
