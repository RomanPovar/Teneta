const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  filters: <><path d="M4 7h7m4 0h5M4 17h3m4 0h9" /><circle cx="13" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  down: <path d="m6 9 6 6 6-6" />,
  up: <path d="m6 15 6-6 6 6" />,
  sort: <><path d="m8 9 4-4 4 4m-8 6 4 4 4-4" /></>,
  left: <path d="m14 6-6 6 6 6" />,
  right: <path d="m10 6 6 6-6 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  building: <><path d="M4 21V5l10-2v18M14 9h6v12M2 21h20M8 8h2m-2 4h2m-2 4h2m6-3h1m-1 4h1" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V3h8v4M3 12c6 4 12 4 18 0M12 12v4" /></>,
  layers: <><path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14M11 4H4v16h16v-7" /></>,
  reset: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" /></>,
  file: <><path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8m-8 4h6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};

export default function Icon({ name, size = 20, className = "" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name] ?? paths.file}</svg>;
}
