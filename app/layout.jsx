import "./globals.css";

export const metadata = {
  title: "MyOTT - MovieMind DNA",
  description: "좋아한 작품으로 취향 DNA를 분석하고 OTT 추천을 받아보세요.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
