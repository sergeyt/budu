# Event Registration App

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js-000000?logo=next.js)](https://nextjs.org/)

**Event Registration App** — A modern **Next.js + Prisma + NextAuth** application for managing event participation.  
Users can register via **Yandex ID, VK ID, Sber ID, or TBank ID**, select event places, and join or leave events with automatic waitlist handling.  
Supports **dual capacities** (confirmed + reserved lists). Built with **Chakra UI**, fully deployable on **Vercel**.

---

## 🧭 Features

- **OAuth login:** Yandex ID, VK ID, Sber ID, TBank ID (Tinkoff ID)
- **Event registration rules:** only within 24h before event start
- **Dual capacities:** confirmed + reserved waitlist
- **Prisma ORM** with SQLite/Postgres support
- **NextAuth v5** with Prisma adapter
- **Chakra UI** mobile-first responsive design
- **Deploy-ready** on Vercel or any Node server

---

## 🧩 Tech Stack

- **Next.js (App Router)** — modern routing, server actions, and auth
- **NextAuth.js** — OAuth via Russian identity providers
- **Prisma ORM** — schema-driven database access
- **SQLite (local)** or **PostgreSQL (production)**
- **Chakra UI** — clean, accessible component library
- **TypeScript** — full typing and developer safety

---

## ⚙️ Setup

### 1. Clone and install

```bash
git clone https://github.com/sergeyt/budu.git
cd budu
pnpm install
````

### 2. Environment variables

Create `.env.local`:

```bash
# Database
DATABASE_URL="file:./dev.db"
# provider must be a literal string for IntelliJ
# provider = "sqlite" or "postgresql"

# NextAuth
AUTH_URL=http://localhost:3000
AUTH_SECRET=your_random_long_secret
AUTH_TRUST_HOST=true

# OAuth credentials
YANDEX_CLIENT_ID=...
YANDEX_CLIENT_SECRET=...
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
SBER_ISSUER=https://login.sber.ru/oidc/
SBER_CLIENT_ID=...
SBER_CLIENT_SECRET=...
TBANK_ISSUER=https://id.tinkoff.ru/oidc/
TBANK_CLIENT_ID=...
TBANK_CLIENT_SECRET=...
```

### 3. Prisma

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

---

## 🗄️ Schema Overview

```prisma
model User {
  id             String       @id @default(cuid())
  name           String?
  email          String?      @unique
  image          String?
  rttfProfileUrl String?
  role           UserRole     @default(USER)
  createdAt      DateTime     @default(now())
  accounts       Account[]
  sessions       Session[]
  registrations  Registration[]
  adminPlaces    PlaceAdmin[]
}

model Place {
  id          String       @id @default(cuid())
  name        String       @unique
  location    String?
  description String?
  infoUrl     String?
  createdAt   DateTime     @default(now())
  events      Event[]
  admins      PlaceAdmin[]
}

model PlaceAdmin {
  id        String   @id @default(cuid())
  userId    String
  placeId   String
  createdAt DateTime @default(now())
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  place Place @relation(fields: [placeId], references: [id], onDelete: Cascade)
  @@unique([userId, placeId])
}

model Event {
  id              String   @id @default(cuid())
  title           String
  startAt         DateTime
  placeId         String
  place           Place    @relation(fields: [placeId], references: [id], onDelete: Cascade)
  capacity        Int?
  reserveCapacity Int?
  createdAt       DateTime @default(now())
  regs            Registration[]
}

enum RegistrationStatus {
  CONFIRMED
  RESERVED
}

model Registration {
  id        String              @id @default(cuid())
  userId    String
  eventId   String
  status    RegistrationStatus  @default(CONFIRMED)
  createdAt DateTime            @default(now())
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  @@unique([userId, eventId])
}

enum UserRole {
  USER
  SUPERADMIN
}
```

## 🧪 Development

```bash
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deploy to Vercel

* Add all environment variables in Vercel Dashboard → *Settings → Environment Variables*
* Use **PostgreSQL** (e.g., Neon, Supabase) in production
* Provider must be a literal (`"postgresql"`) in `schema.prisma`
* NextAuth works natively with Edge functions on Vercel

---

## 🛡️ Security Notes

* All registration actions are protected by **NextAuth sessions**
* Server actions only execute with authenticated users
* No client-side access to Prisma or secrets
* Use HTTPS + strong `AUTH_SECRET` in production

---

## 📜 License

**MIT License**
© 2025 Sergey Todyshev
