import type { Metadata } from "next";
import { Roboto, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./session-provider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-sans",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Running Passport",
  description: "Every country and state you've run in, in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-[#0b1410] text-[#f5f1e8] font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
