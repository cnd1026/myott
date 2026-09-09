import "./globals.css";

export const metadata = {
  title: "MyOTT - MovieMind DNA",
  description: "좋아한 작품으로 취향 DNA를 분석하고 OTT 추천을 받아보세요.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <footer className="attribution-footer" aria-labelledby="attribution-heading">
          <div className="attribution-content">
            <h2 id="attribution-heading">데이터 출처·고지</h2>
            <div className="attribution-tmdb">
              <img
                src="/tmdb-approved-logo.svg"
                alt="TMDB approved logo"
                width="112"
                height="28"
              />
              <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
            </div>
            <p className="attribution-justwatch">OTT 제공 정보 및 시청 가능 여부 데이터 출처: JustWatch</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
