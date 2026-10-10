import logoUrl from "../assets/teneta-logo.png";
import romanPhoto from "../assets/team/roman-povar.png";
import yulianaPhoto from "../assets/team/yuliana-panchuk.png";
import milanaPhoto from "../assets/team/milana-poroshynska.png";
import Icon from "../components/Icon.jsx";
import { useLanguage } from "../i18n/useLanguage.js";
import { ROUTES } from "../navigation/routes.js";

const TEAM = Object.freeze([
  { id: "roman", photo: romanPhoto },
  { id: "yuliana", photo: yulianaPhoto },
  { id: "milana", photo: milanaPhoto },
]);

export default function LandingPage() {
  const { t } = useLanguage();
  return (
    <div className="landing-page">
      <section className="landing-intro" aria-labelledby="home-heading">
        <div className="landing-logo">
          <img src={logoUrl} alt="Teneta" width="1536" height="1024" draggable="false" />
        </div>
        <div className="landing-description">
          <h1 id="home-heading">{t("home.heading")}</h1>
          <p>{t("home.description")}</p>
          <a className="button landing-cta" href={ROUTES.catalogue}>
            {t("home.openCatalogue")}<Icon name="arrow" size={19} />
          </a>
        </div>
      </section>
      <section className="team-section" aria-labelledby="team-heading">
        <div className="team-heading">
          <p className="section-label">{t("team.label")}</p>
          <h2 id="team-heading" lang="en">make kyiv great again</h2>
        </div>
        <ul className="team-members">
          {TEAM.map((member) => (
            <li key={member.id} className="team-member">
              <span className={`team-avatar team-avatar--${member.id}`}>
                <img src={member.photo} alt={t(`team.${member.id}.name`)}
                  width="64" height="64" loading="lazy" decoding="async" />
              </span>
              <div className="team-member-copy">
                <h3>{t(`team.${member.id}.name`)}</h3>
                <p className="team-role">{t(`team.${member.id}.role`)}</p>
                <p className="team-description">{t(`team.${member.id}.description`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
