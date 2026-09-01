import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "EventReport",
    template: "%s · EventReport",
  },
  description:
    "Informes ejecutivos, técnicos y de cumplimiento a partir de los logs y la configuración de tu firewall.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-419" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
