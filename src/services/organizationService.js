import { normalizePayload } from "../lib/catalog.js";

const configuredUrl = import.meta.env.VITE_ORGANIZATIONS_URL?.trim();
export const DATA_SOURCE = configuredUrl ? "Backend API" : "Local JSON";
export const ORGANIZATIONS_URL = configuredUrl || `${import.meta.env.BASE_URL}data/organizations.json`;

/** The only network boundary. No API credentials belong in frontend code. */
export async function loadOrganizations({ signal } = {}) {
  const response = await fetch(ORGANIZATIONS_URL, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Could not load the catalogue (HTTP ${response.status}).`);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The server did not return valid JSON. Check the data file or API URL.");
  }
  return normalizePayload(payload);
}
