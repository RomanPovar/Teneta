import { useSyncExternalStore } from "react";
import { routeFromHash } from "./routes.js";
function subscribe(onChange) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function getSnapshot() { return window.location.hash; }
/** Subscribe to the whole hash so changing only the focused organization also renders. */
export function useRouteHash() { return useSyncExternalStore(subscribe, getSnapshot, () => ""); }
export function usePageRoute() { return routeFromHash(useRouteHash()); }
