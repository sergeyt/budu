import { DateTime } from "luxon";
import { prisma } from "../lib/prisma";

function startIn(from: Date, hours: number) {
  return DateTime.fromJSDate(from).plus({ hours }).toJSDate();
}

function tomorrowAt(from: Date, at: number) {
  return DateTime.fromJSDate(from)
    .startOf("day")
    .plus({ hours: 24 })
    .set({ hour: at })
    .toJSDate();
}

async function main() {
  const PLACE_CRNT = {
    name: "ЦРНТ",
    description: "",
    location: "",
    infoUrl: "https://tennis-sochi.ru/",
  };
  const PLACE_PING_PONG_HOUSE = {
    name: "Ping Pong House",
    description: "",
    location: "",
    infoUrl: "https://ping-pong-house.ru/",
  };
  const PLACE_DAGOMYS = {
    name: "Дагомыс Арена",
    description: `
🏓 Наш уютный зал настольного тенниса в Дагомысе
У нас тесно, но весело! Атмосфера — как дома:
все свои, шум мячиков и море позитива 🎉
Есть секция для детей, так что можно играть всей семьёй.

📞 Записаться на тренировку или забронировать стол можно по телефону:
+7-928-665-44-51 (Юрий Михайлович).

Приходите — место небольшое, но душа огромная ❤️
    `.trim(),
    location:
      "https://yandex.ru/maps/239/sochi/house/armavirskaya_ulitsa_54/Z0AYcAJiSUMPQFppfXp0eXRjYA==/?ll=39.654122%2C43.658741&z=17.2",
    // TODO make a page to display trivial page describing a place
    infoUrl: "https://yabudu.vercel.app/places/1",
  };

  const [crnt, ping_pong_house, dagomys] = await Promise.all([
    prisma.place.upsert({
      where: { name: PLACE_CRNT.name },
      create: PLACE_CRNT,
      update: PLACE_CRNT,
    }),
    prisma.place.upsert({
      where: { name: PLACE_PING_PONG_HOUSE.name },
      create: PLACE_PING_PONG_HOUSE,
      update: {},
    }),
    prisma.place.upsert({
      where: { name: PLACE_DAGOMYS.name },
      create: PLACE_DAGOMYS,
      update: PLACE_DAGOMYS,
    }),
  ]);

  const now = new Date();
  const _in36h = startIn(now, 36);
  const _in3h = startIn(now, 3);
  const t7pm = tomorrowAt(now, 19);
  const t10am = tomorrowAt(now, 10);

  const game1 = {
    id: "e1",
    title: "Лесенка",
    placeId: crnt.id,
    startAt: t7pm,
    capacity: 24,
    reserveCapacity: 6,
  };
  const game2 = {
    id: "e2",
    title: "Лесенка 200+",
    placeId: ping_pong_house.id,
    startAt: t7pm,
    capacity: 12,
    reserveCapacity: 2,
  };
  const game3 = {
    id: "e3",
    title: "Утреняя Заря",
    placeId: dagomys.id,
    startAt: t10am,
    capacity: 4,
    reserveCapacity: 2,
  };

  // upsert events
  for (const game of [game1, game2, game3]) {
    await prisma.event.upsert({
      where: { id: game.id },
      create: game,
      update: game,
    });
  }

  // Sample weekly templates so the bot has something to materialize /
  // announce. Idempotent: looked up by (placeId, title). Timezone is
  // inherited from `Place.timezone` (defaults to Europe/Moscow).
  //
  // `localTime` is a Postgres TIME(0) — Prisma wants a Date whose
  // *time-of-day* is what matters. We build it as a UTC date so the local
  // clock of whoever runs the seed doesn't shift the hour.
  const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

  const templates = [
    {
      placeId: crnt.id,
      title: "Лесенка (еженедельно)",
      dayOfWeek: 3, // Wednesday
      localTime: time("19:00"),
      capacity: 24,
      reserveCapacity: 6,
      announceOffsetMinutes: 24 * 60,
    },
    {
      placeId: dagomys.id,
      title: "Утренняя Заря (еженедельно)",
      dayOfWeek: 6, // Saturday
      localTime: time("10:00"),
      capacity: 4,
      reserveCapacity: 2,
      announceOffsetMinutes: 12 * 60,
    },
  ];

  for (const tpl of templates) {
    const existing = await prisma.eventTemplate.findFirst({
      where: { placeId: tpl.placeId, title: tpl.title },
      select: { id: true },
    });
    if (existing) {
      await prisma.eventTemplate.update({
        where: { id: existing.id },
        data: tpl,
      });
    } else {
      await prisma.eventTemplate.create({ data: tpl });
    }
  }
}

main().then(() => prisma.$disconnect());
