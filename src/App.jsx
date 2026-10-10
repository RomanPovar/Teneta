import { useEffect, useRef } from "react";
import "./App.css";
import "./SearchBar.css";
import "./pages/LandingPage.css";
import LanguageProvider from "./i18n/LanguageProvider.jsx";
import { useLanguage } from "./i18n/useLanguage.js";
import SiteHeader from "./components/SiteHeader.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import CataloguePage from "./pages/CataloguePage.jsx";
import { ROUTES, routeTitleKey } from "./navigation/routes.js";
import { usePageRoute } from "./navigation/usePageRoute.js";

function Site() {
  const { t } = useLanguage();
  const page = usePageRoute();
  const mainRef = useRef(null);
  const previousPage = useRef(page);

  useEffect(() => {
    document.title = t(routeTitleKey(page));
  }, [page, t]);

  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    // Wait for a closing record dialog to finish restoring focus first.
    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page]);

  function skipToContent(event) {
    event.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <div className="app-shell">
      <a href={ROUTES[page]} className="skip-link" onClick={skipToContent}>{t("nav.skip")}</a>
      <SiteHeader page={page} />
      <main id="main-content" ref={mainRef} className={`main-container site-main site-main--${page}`} tabIndex={-1}>
        {page === "home" && <LandingPage />}
        {/* Retain catalogue state across navigation, but never display a hidden modal. */}
        <CataloguePage active={page === "catalogue"} />
      </main>
    </div>
  );
}

export default function App() {
  return <LanguageProvider><Site /></LanguageProvider>;
}
