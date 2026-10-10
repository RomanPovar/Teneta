export const ROUTES = Object.freeze({ home: "#/", catalogue: "#/catalogue", maps: "#/maps" });

/** The root remains Home; graph organization IDs live in the hash query. */
export function routeFromHash(hash = "") {
  const route = String(hash).replace(/^#/, "").split("?")[0].replace(/\/+$/, "");
  if (route === "/catalogue" || route === "catalogue") return "catalogue";
  if (route === "/maps" || route === "maps") return "maps";
  return "home";
}
export function organizationFromHash(hash = "") {
  if (routeFromHash(hash) !== "maps") return null;
  const value = new URLSearchParams(String(hash).split("?").slice(1).join("?")).get("organization");
  return value?.trim() || null;
}
export function graphHref(organizationId) {
  return organizationId == null || String(organizationId).trim() === "" ? ROUTES.maps
    : `${ROUTES.maps}?organization=${encodeURIComponent(String(organizationId))}`;
}
export function routeTitleKey(route) {
  return route === "catalogue" ? "page.title" : route === "maps" ? "maps.title" : "home.title";
}
