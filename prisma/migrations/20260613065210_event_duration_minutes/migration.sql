-- Convert Event.duration (text, e.g. "1h", "60m", "60") into
-- Event.durationMinutes (integer minutes). Existing values are parsed
-- best-effort; anything unrecognized falls back to the new default (60).
ALTER TABLE "Event"
  ALTER COLUMN "duration" DROP DEFAULT;

ALTER TABLE "Event"
  ALTER COLUMN "duration" TYPE INTEGER USING (
    CASE
      WHEN "duration" IS NULL THEN NULL
      WHEN "duration" ~ '^[0-9]+h$' THEN (substring("duration" FROM '^[0-9]+'))::int * 60
      WHEN "duration" ~ '^[0-9]+m$' THEN (substring("duration" FROM '^[0-9]+'))::int
      WHEN "duration" ~ '^[0-9]+$' THEN "duration"::int
      ELSE 60
    END
  );

ALTER TABLE "Event"
  ALTER COLUMN "duration" SET DEFAULT 60;

ALTER TABLE "Event"
  RENAME COLUMN "duration" TO "durationMinutes";
