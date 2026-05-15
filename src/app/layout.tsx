import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Gustav - Gestion",
  description: "Plateforme de gestion Gustav",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
