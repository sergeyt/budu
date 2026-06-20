export type DateLike = Date | number | string;

export type Opt<T> = T | undefined | null;

export enum UserRole {
  USER = "USER",
  SUPERADMIN = "SUPERADMIN",
}

export type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: UserRole;
};

export type Place = {
  id: string;
  name: string;
  description?: Opt<string>;
  location?: Opt<string>;
  infoUrl?: Opt<string>;
  timezone: string;
  createdAt: DateLike;
  updatedAt: DateLike;
};

export type EventTemplate = {
  id: string;
  placeId: string;
  title: string;
  description: Opt<string>;
  infoUrl: Opt<string>;
  /** ISO 1 = Mon … 7 = Sun. */
  dayOfWeek: number;
  /**
   * Postgres TIME(0) surfaced by Prisma as a Date pinned to 1970-01-01
   * with the time-of-day populated. Use `dateToLocalTime` from
   * `lib/templates` to render.
   */
  localTime: DateLike;
  durationMinutes: Opt<number>;
  capacity: Opt<number>;
  reserveCapacity: Opt<number>;
  announceOffsetMinutes: number;
  enabled: boolean;
  createdAt: DateLike;
  updatedAt: DateLike;
};

export enum RegistrationStatus {
  CONFIRMED = "CONFIRMED",
  RESERVED = "RESERVED",
}

export type Registration = {
  id: string;
  userId: string;
  status: RegistrationStatus;
  createdAt: DateLike;
  user?: { name?: string | null; email?: string | null; image?: string | null };
};

export type WorldEvent = {
  id: string;
  title: string;
  description: Opt<string>;
  startAt: DateLike;
  durationMinutes: Opt<number>;
  capacity: Opt<number>;
  reserveCapacity: Opt<number>;
  regs?: Registration[];
};

export enum ChannelType {
  TELEGRAM = "TELEGRAM",
  WHATSAPP = "WHATSAPP",
  SLACK = "SLACK",
  MAX = "MAX",
  EMAIL = "EMAIL",
  WEBHOOK = "WEBHOOK",
}
