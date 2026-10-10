import { useSyncExternalStore } from "react";
import { routeFromHash } from "./routes.js";

function subscribe(onChange) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot() {
  return routeFromHash(window.location.hash);
}

/** Hash navigation works on static hosts without server-side URL rewrites. */
export function usePageRoute() {
  return useSyncExternalStore(subscribe, getSnapshot, () => "home");
}
