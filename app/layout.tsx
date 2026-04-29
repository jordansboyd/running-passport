import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./session-provider";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Running Passport",
  description: "See every country you've run in",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.className}>
      <body className="min-h-screen bg-[#223240] text-white">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
