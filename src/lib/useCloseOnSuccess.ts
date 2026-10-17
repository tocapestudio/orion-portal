import { useState } from "react";

interface SuccessState {
  success: boolean;
}

/**
 * Cierra un formulario/modal cuando una accion useActionState pasa a
 * success, ajustando el estado durante el render (patron recomendado
 * por React) en vez de en un efecto — evita la regla
 * react-hooks/set-state-in-effect sin depender de pasar setState
 * como prop.
 */
export function useCloseOnSuccess<T extends SuccessState>(state: T, close: () => void) {
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.success) close();
  }
}
