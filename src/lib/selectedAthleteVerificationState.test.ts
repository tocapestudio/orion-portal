/**
 * Pruebas de deriveSelectedAthleteVerificationState() - test runner
 * nativo de Node (node:test + node:assert/strict), mismo patron que
 * athletes.test.ts/athleteOwnership.ts.
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en los
 * otros archivos de test de este proyecto: TS5097).
 *
 * Alcance: esta es la logica PURA de derivacion de estado que usa
 * useVerifiedSelectedAthlete.ts (hook de React, no testeable aqui por
 * las mismas razones ya documentadas para componentes/hooks en este
 * proyecto - no hay libreria de testing de React instalada y no se ha
 * añadido ninguna). Lo que prueban estos tests es exactamente la
 * decision de que exponer (error/verified/isChecking) dado un estado ya
 * conocido - NO prueban que AthleteSelectionGate.tsx/
 * VisualLabAthleteCard.tsx rendericen correctamente ese estado, ni que
 * el useEffect real llame a esta funcion con los valores correctos en
 * un navegador real. Esa parte sigue sin verificacion automatizada.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./selectedAthleteVerificationState" + ".ts";
const { deriveSelectedAthleteVerificationState } = await import(modulePath);

describe("deriveSelectedAthleteVerificationState", () => {
  test("respuesta normal: verification coincide con el athleteId actual -> verified con datos, sin error, sin comprobar", () => {
    const state = deriveSelectedAthleteVerificationState(
      "ATH1",
      { athleteId: "ATH1", result: { athleteId: "ATH1", fullName: "Juan Perez", shortId: 12 } },
      null
    );
    assert.deepEqual(state, {
      error: false,
      verified: { athleteId: "ATH1", fullName: "Juan Perez", shortId: 12 },
      isChecking: false,
    });
  });

  test("atleta no accesible (verification.result = null): sigue el flujo existente, sin error, verified null", () => {
    const state = deriveSelectedAthleteVerificationState(
      "ATH1",
      { athleteId: "ATH1", result: null },
      null
    );
    assert.deepEqual(state, { error: false, verified: null, isChecking: false });
  });

  test("verificacion todavia en curso (no coincide ninguna respuesta previa) -> isChecking, nunca verified ni error", () => {
    const state = deriveSelectedAthleteVerificationState("ATH1", null, null);
    assert.deepEqual(state, { error: false, verified: null, isChecking: true });
  });

  test("fallo real para ESTE athleteId -> error=true, isChecking=false (nunca atascado), verified NUNCA se concede", () => {
    const state = deriveSelectedAthleteVerificationState("ATH1", null, "ATH1");
    assert.deepEqual(state, { error: true, verified: null, isChecking: false });
  });

  test("error y verified son mutuamente excluyentes incluso si hubiera una verification obsoleta coincidente por error de implementacion", () => {
    // Caso defensivo: si por alguna razon verification SI coincidiera con
    // el athleteId fallido (no deberia pasar con el flujo real del hook,
    // que limpia el fallo antes de cada intento), error sigue ganando -
    // nunca se expone un `verified` mientras error=true.
    const state = deriveSelectedAthleteVerificationState(
      "ATH1",
      { athleteId: "ATH1", result: { athleteId: "ATH1", fullName: "Alguien", shortId: 1 } },
      "ATH1"
    );
    assert.equal(state.error, true);
    assert.equal(state.verified, null);
  });

  test("fallo registrado para OTRO athleteId (seleccion ya cambiada) no afecta al actual", () => {
    const state = deriveSelectedAthleteVerificationState("ATH2", null, "ATH1");
    assert.deepEqual(state, { error: false, verified: null, isChecking: true });
  });

  test("sin ninguna seleccion (athleteId null): nunca checking, nunca error, nunca verified", () => {
    const state = deriveSelectedAthleteVerificationState(null, null, null);
    assert.deepEqual(state, { error: false, verified: null, isChecking: false });
  });
});
