import "./globals.css";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { Inter } from "next/font/google";
import { Provider as UIProvider } from "../ui/provider";
import { NextAuthProvider } from "./providers";
import { Toaster } from "@/ui/index";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-main",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <NextIntlClientProvider>
          <UIProvider>
            <NextAuthProvider>
              <Toaster />
              {children}
            </NextAuthProvider>
          </UIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
