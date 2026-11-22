import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Debouncer } from "./debouncer.ts";

test("dispara una sola vez tras varios push seguidos", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const fired: string[] = [];
  const d = new Debouncer(300, (k) => fired.push(k));
  d.push("a");
  mock.timers.tick(200);
  d.push("a");
  mock.timers.tick(200);
  assert.deepEqual(fired, []);
  mock.timers.tick(100);
  assert.deepEqual(fired, ["a"]);
  mock.timers.reset();
});

test("claves distintas disparan por separado", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const fired: string[] = [];
  const d = new Debouncer(300, (k) => fired.push(k));
  d.push("a");
  d.push("b");
  mock.timers.tick(300);
  assert.deepEqual(fired.sort(), ["a", "b"]);
  mock.timers.reset();
});

test("dispose cancela los pendientes", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  const fired: string[] = [];
  const d = new Debouncer(300, (k) => fired.push(k));
  d.push("a");
  d.dispose();
  mock.timers.tick(1000);
  assert.deepEqual(fired, []);
  mock.timers.reset();
});
