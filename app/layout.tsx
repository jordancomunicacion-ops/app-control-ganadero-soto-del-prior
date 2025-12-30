import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soto del Prior - Control Ganadero",
  description: "Gestión avanzada de ganadería",
  // icons handled by app/icon.png convention
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (typeof window !== 'undefined') {
    // Self-healing: Clear corrupted non-JSON strings from critical keys
    ['sessionUser', 'appSession'].forEach(key => {
      const val = localStorage.getItem(key);
      if (val && !val.startsWith('{') && !val.startsWith('[') && !val.startsWith('"')) {
        localStorage.removeItem(key);
      }
    });
  }
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
