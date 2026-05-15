import type { Metadata, Viewport } from "next";
import "./tokens.css";
import "./globals.css";
import "./animations.css";
import "./game.css";
import "./home.css";
import "./birthday.css";
import "./jauge.css";
import "./summary.css";
import "./ui.css";

export const metadata: Metadata = {
  title: "Badaboum — Jeux de soirée",
  description: "Jeux de soirée à jouer entre amis depuis ton téléphone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0613",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
