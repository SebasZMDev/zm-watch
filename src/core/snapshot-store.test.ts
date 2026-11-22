import { test } from "node:test";
import assert from "node:assert/strict";
import { SnapshotStore } from "./snapshot-store.ts";

test("get devuelve lo guardado con set", () => {
  const s = new SnapshotStore();
  s.set("a", "hola");
  assert.equal(s.get("a"), "hola");
  assert.equal(s.get("b"), undefined);
});

test("set reemplaza el contenido previo y ajusta bytes", () => {
  const s = new SnapshotStore();
  s.set("a", "hola");
  s.set("a", "hi");
  assert.equal(s.get("a"), "hi");
  assert.equal(s.size, 1);
  assert.equal(s.bytes, 2);
});

test("delete quita la entrada y descuenta bytes", () => {
  const s = new SnapshotStore();
  s.set("a", "hola");
  s.delete("a");
  assert.equal(s.get("a"), undefined);
  assert.equal(s.size, 0);
  assert.equal(s.bytes, 0);
});

test("al superar maxFiles descarta la menos usada", () => {
  const s = new SnapshotStore({ maxFiles: 2, maxBytes: 1000 });
  s.set("a", "1");
  s.set("b", "2");
  s.set("c", "3");
  assert.equal(s.get("a"), undefined);
  assert.equal(s.get("b"), "2");
  assert.equal(s.get("c"), "3");
});

test("get cuenta como uso y salva la entrada del descarte", () => {
  const s = new SnapshotStore({ maxFiles: 2, maxBytes: 1000 });
  s.set("a", "1");
  s.set("b", "2");
  s.get("a");
  s.set("c", "3");
  assert.equal(s.get("a"), "1");
  assert.equal(s.get("b"), undefined);
});

test("al superar maxBytes descarta hasta caber", () => {
  const s = new SnapshotStore({ maxFiles: 100, maxBytes: 10 });
  s.set("a", "1234");
  s.set("b", "1234");
  s.set("c", "1234");
  assert.equal(s.get("a"), undefined);
  assert.equal(s.get("b"), "1234");
  assert.equal(s.get("c"), "1234");
  assert.equal(s.bytes, 8);
});

test("un contenido mayor que maxBytes no se guarda", () => {
  const s = new SnapshotStore({ maxFiles: 100, maxBytes: 3 });
  s.set("a", "ab");
  s.set("a", "abcdef");
  assert.equal(s.get("a"), undefined);
  assert.equal(s.size, 0);
  assert.equal(s.bytes, 0);
});
