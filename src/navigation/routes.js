export const ROUTES = Object.freeze({ home: "#/", catalogue: "#/catalogue" });

/** Only explicit catalogue links select it; the site root always opens Home. */
export function routeFromHash(hash = "") {
  const route = String(hash).replace(/^#/, "").split("?")[0].replace(/\/+$/, "");
  return route === "/catalogue" || route === "catalogue" ? "catalogue" : "home";
}

export function routeTitleKey(route) {
  return route === "catalogue" ? "page.title" : "home.title";
}
