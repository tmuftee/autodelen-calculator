import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autodelen Calculator — Cambio & Dégage",
  description: "Estimate and compare Cambio and Dégage carsharing trip prices in Belgium.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-50 font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Autodelen Calculator
            </Link>
            <Link href="/admin" className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
              Pricing admin
            </Link>
          </div>
        </header>
        <main className="flex flex-1 justify-center px-4 py-8">
          <div className="w-full max-w-xl">{children}</div>
        </main>
        <footer className="border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
          Estimates only — always confirm the final price with{" "}
          <a href="https://www.cambio.be" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            cambio.be
          </a>{" "}
          or{" "}
          <a href="https://www.degage.be" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            degage.be
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
