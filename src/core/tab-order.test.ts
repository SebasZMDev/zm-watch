import { test } from "node:test";
import assert from "node:assert/strict";
import { TabOrder } from "./tab-order.ts";

test("touch mueve la clave al final sin duplicar", () => {
  const t = new TabOrder();
  t.touch("a");
  t.touch("b");
  t.touch("a");
  assert.deepEqual(t.overflow(1), ["b"]);
});

test("overflow devuelve y quita las más antiguas", () => {
  const t = new TabOrder();
  ["a", "b", "c"].forEach((k) => t.touch(k));
  assert.deepEqual(t.overflow(2), ["a"]);
  assert.deepEqual(t.overflow(2), []);
});

test("prune descarta las claves sin pestaña abierta", () => {
  const t = new TabOrder();
  ["a", "b", "c"].forEach((k) => t.touch(k));
  t.prune(new Set(["a", "c"]));
  assert.deepEqual(t.overflow(1), ["a"]);
});
