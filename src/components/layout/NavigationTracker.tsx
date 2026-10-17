"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markInternalNavigation } from "@/lib/navigationHistory";

/**
 * Se monta una vez en el layout del Portal (invisible). Marca cada
 * cambio de ruta POSTERIOR al primer render como navegacion interna,
 * para que BackButton sepa cuando es seguro usar router.back().
 */
export default function NavigationTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    markInternalNavigation();
  }, [pathname]);

  return null;
}
