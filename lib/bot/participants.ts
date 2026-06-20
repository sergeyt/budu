import type { User } from "@prisma/client";

export function displayNameForUser(user: User): string {
  return (
    user.name?.trim() ||
    user.telegramFirstName?.trim() ||
    user.telegramUsername?.trim() ||
    user.email?.trim() ||
    "Anonymous"
  );
}
