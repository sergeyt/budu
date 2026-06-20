import type { ReactNode } from "react";
import Script from "next/script";
import { Provider as UIProvider } from "@/ui/provider";

/** Minimal layout for Telegram Mini App pages (no auth session chrome). */
export default function TgLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <UIProvider>
        <main style={{ minHeight: "100vh", width: "100%" }}>{children}</main>
      </UIProvider>
    </>
  );
}
