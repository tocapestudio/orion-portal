import assert from "node:assert/strict";
import { describe, test } from "node:test";

const modulePath = "./reactAccess" + ".ts";
const { hasReactAccess, REACT_ALLOWED_ROLES } = await import(modulePath);

describe("hasReactAccess", () => {
  test("admin tiene acceso", () => {
    assert.equal(hasReactAccess(["admin"]), true);
  });

  test("professional tiene acceso", () => {
    assert.equal(hasReactAccess(["professional"]), true);
  });

  test("athlete (deportista) NO tiene acceso", () => {
    assert.equal(hasReactAccess(["athlete"]), false);
  });

  test("coach (entrenador) NO tiene acceso", () => {
    assert.equal(hasReactAccess(["coach"]), false);
  });

  test("researcher NO tiene acceso", () => {
    assert.equal(hasReactAccess(["researcher"]), false);
  });

  test("ningun rol (array vacio) NO tiene acceso", () => {
    assert.equal(hasReactAccess([]), false);
  });

  test("basta con que UNO de los roles sea admin/professional, aunque haya otros denegados", () => {
    assert.equal(hasReactAccess(["athlete", "coach", "professional"]), true);
  });

  test("varios roles denegados juntos siguen sin dar acceso", () => {
    assert.equal(hasReactAccess(["athlete", "coach", "researcher"]), false);
  });

  test("REACT_ALLOWED_ROLES es exactamente {admin, professional} - ni mas ni menos", () => {
    assert.deepEqual([...REACT_ALLOWED_ROLES].sort(), ["admin", "professional"]);
  });
});
