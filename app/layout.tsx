import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load the Geist font families and expose them as CSS variables
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Page metadata (title/description shown in the browser tab and search results)
export const metadata: Metadata = {
  title: "enorin · Zero Portal",
  description: "Zentrales Portal für die Energiewirtschaft von enorin.", // "Central portal for enorin's energy business."
  applicationName: "enorin Zero",
};

// Mobile viewport/theme configuration
export const viewport: Viewport = {
  themeColor: "#04161f",
  width: "device-width",
  initialScale: 1,
};

// Root layout wrapping every page: sets the <html>/<body> tags, language,
// and font variables shared across the whole app.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-svh bg-background text-foreground">{children}</body>
    </html>
  );
}
