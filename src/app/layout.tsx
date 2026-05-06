import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Penca Mundial 2026 | Mundo Shop",
  description: "La penca del Mundial 2026 de Mundo Shop. ¡Predecí los resultados y ganá!",
  openGraph: {
    title: "Penca Mundial 2026 | Mundo Shop",
    description: "La penca del Mundial 2026 de Mundo Shop. ¡Predecí los resultados y ganá!",
    images: [
      {
        url: "https://penca-2026-mundoshoop-production.up.railway.app/mundoshop-logo-dark.png",
        width: 800,
        height: 400,
        alt: "Penca Mundial 2026 - Mundo Shop",
      },
    ],
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[var(--font-montserrat)]">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
