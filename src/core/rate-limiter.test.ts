import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "./rate-limiter.ts";

test("permite hasta el máximo dentro de la ventana", () => {
  const r = new RateLimiter(2, 1000);
  assert.equal(r.tryAcquire(0), true);
  assert.equal(r.tryAcquire(100), true);
  assert.equal(r.tryAcquire(200), false);
});

test("vuelve a permitir cuando sale de la ventana", () => {
  const r = new RateLimiter(1, 1000);
  assert.equal(r.tryAcquire(0), true);
  assert.equal(r.tryAcquire(999), false);
  assert.equal(r.tryAcquire(1000), true);
});
