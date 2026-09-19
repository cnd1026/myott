import "./globals.css";
import { getMessage } from "../src/lib/i18n/messageCatalog.js";

const RUNTIME_UI_LOCALE = "ko-KR";
const message = (key, values) => getMessage(RUNTIME_UI_LOCALE, key, values);

export const metadata = {
  title: message("metadata.title"),
  description: message("metadata.description"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <footer className="attribution-footer" aria-labelledby="attribution-heading">
          <div className="attribution-content">
            <h2 id="attribution-heading">{message("attribution.heading")}</h2>
            <div className="attribution-tmdb">
              <img
                src="/tmdb-approved-logo.svg"
                alt={message("attribution.tmdbLogoAlt")}
                width="112"
                height="28"
              />
              <p>{message("attribution.tmdbDisclaimer")}</p>
            </div>
            <p className="attribution-justwatch">{message("attribution.justWatch")}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
