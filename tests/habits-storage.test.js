import test from "node:test";
import assert from "node:assert/strict";
import { loadState, saveState } from "../src/scripts/habits/storage.js";

const original = {
  habits: [{ id: "existing", name: "Walk", order: 0 }],
  days: {},
};

test("existing localStorage data survives unavailable IndexedDB and saves to the same key", async () => {
  const values = new Map([["daily-scorecard", JSON.stringify(original)]]);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  globalThis.indexedDB = {
    open() {
      throw new Error("blocked");
    },
  };
  const state = await loadState();
  assert.deepEqual(state, original);
  state.habits[0].name = "Updated";
  await saveState(state);
  assert.equal(
    JSON.parse(values.get("daily-scorecard")).habits[0].name,
    "Updated",
  );
});

test("IndexedDB uses the existing database/store/key and saves only on transaction completion", async () => {
  let saved;
  let reading = original;
  const database = {
    transaction(store, mode) {
      assert.equal(store, "app");
      const transaction = {
        objectStore(name) {
          assert.equal(name, "app");
          return {
            get(key) {
              assert.equal(key, "state");
              const request = {};
              queueMicrotask(() => {
                request.result = reading;
                request.onsuccess();
              });
              return request;
            },
            put(value, key) {
              assert.equal(mode, "readwrite");
              assert.equal(key, "state");
              saved = structuredClone(value);
              queueMicrotask(() => transaction.oncomplete());
            },
          };
        },
      };
      return transaction;
    },
  };
  globalThis.indexedDB = {
    open(name, version) {
      assert.equal(name, "daily-scorecard");
      assert.equal(version, 1);
      const request = {};
      queueMicrotask(() => {
        request.result = database;
        request.onsuccess();
      });
      return request;
    },
  };
  assert.deepEqual(await loadState(), original);
  await saveState(original);
  assert.deepEqual(saved, original);

  // Recover data written while IndexedDB was unavailable, even after it returns.
  reading = undefined;
  globalThis.localStorage = { getItem: () => JSON.stringify(original) };
  assert.deepEqual(await loadState(), original);
});
