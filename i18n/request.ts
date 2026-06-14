import { auth } from "@/lib/auth";
import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./routing";

export default getRequestConfig(async ({ locale: locale0 }) => {
  const session = await auth();
  // TODO: add preferredLanguage prop to the user model + session and read it here
  const preferred = (
    session?.user as { preferredLanguage?: string } | undefined
  )?.preferredLanguage;

  const locale1 = locale0 || preferred || defaultLocale;
  const locale = (locales as readonly string[]).includes(locale1)
    ? (locale1 as (typeof locales)[number])
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
