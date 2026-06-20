import "./globals.css";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { Center } from "@chakra-ui/react";
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
              <Center maxW="md" minH="100vh" bg="bg.page">
                <Toaster />
                {children}
              </Center>
            </NextAuthProvider>
          </UIProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
