import { useEffect, useRef, useState } from "react";
import { loadOrganizations } from "../services/organizationService.js";

/** One shared, lazily loaded dataset for both catalogue and semantic maps. */
export function useOrganizations(active) {
  const loaded = useRef(false);
  const [state, setState] = useState({ status: "loading", organizations: [], error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active || loaded.current) return;
    const controller = new AbortController();
    let requestActive = true;
    loadOrganizations({ signal: controller.signal }).then(organizations => {
      if (requestActive) { loaded.current = true; setState({ status: "ready", organizations, error: null }); }
    }).catch(error => {
      if (requestActive && error.name !== "AbortError") { loaded.current = true; setState({ status: "error", organizations: [], error }); }
    });
    return () => { requestActive = false; controller.abort(); };
  }, [active, attempt]);
  function retry() {
    loaded.current = false;
    setState({ status: "loading", organizations: [], error: null });
    setAttempt(value => value + 1);
  }
  return { ...state, retry };
}
