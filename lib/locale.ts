import { getTranslations as getTranslationsImpl } from "next-intl/server";

export async function getTranslations(_req: Request, namespace: string) {
  // TODO get locale from request (via middleware or cookie)
  const locale = "ru";

  const t = await getTranslationsImpl({ locale, namespace });
  return t;
}
