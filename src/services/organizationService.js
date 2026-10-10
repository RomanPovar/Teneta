import { normalizePayload } from "../lib/catalog.js";

const configuredUrl = import.meta.env?.VITE_ORGANIZATIONS_URL?.trim();
export const ORGANIZATIONS_URL = configuredUrl || `${import.meta.env?.BASE_URL ?? "/"}data/organizations.json`;

class CatalogueLoadError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "CatalogueLoadError";
    this.code = code;
    this.status = status;
  }
}

/** Return language-neutral error codes; the interface supplies translated messages. */
export async function loadOrganizations({ signal } = {}) {
  let response;
  try {
    response = await fetch(ORGANIZATIONS_URL, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new CatalogueLoadError("network");
  }
  if (!response.ok) throw new CatalogueLoadError("http", response.status);
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new CatalogueLoadError("invalidJson");
  }
  try {
    return normalizePayload(payload);
  } catch {
    throw new CatalogueLoadError("invalidData");
  }
}
