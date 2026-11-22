import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldIgnore } from "./ignore.ts";

test("ignora node_modules en cualquier nivel", () => {
  assert.equal(shouldIgnore("a/node_modules/b/c.js", ["node_modules"]), true);
});

test("no ignora por coincidencia parcial", () => {
  assert.equal(shouldIgnore("src/my_node_modules_x.ts", ["node_modules"]), false);
});

test("acepta separadores de Windows", () => {
  assert.equal(shouldIgnore("a\\.git\\config", [".git"]), true);
});

test("lista vacía no ignora nada", () => {
  assert.equal(shouldIgnore("a/node_modules/b.js", []), false);
});
