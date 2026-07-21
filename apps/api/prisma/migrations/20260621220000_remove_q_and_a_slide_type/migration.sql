UPDATE "LiveSession"
SET "currentSlideId" = NULL
WHERE "currentSlideId" IN (
  SELECT "id"
  FROM "Slide"
  WHERE "type" = 'Q_AND_A'
);

DELETE FROM "Response"
WHERE "type" = 'Q_AND_A'
  OR "slideId" IN (
    SELECT "id"
    FROM "Slide"
    WHERE "type" = 'Q_AND_A'
  );

DELETE FROM "Slide"
WHERE "type" = 'Q_AND_A';

CREATE TYPE "SlideType_new" AS ENUM (
  'MULTIPLE_CHOICE',
  'WORD_CLOUD',
  'OPEN_ENDED',
  'SCALES',
  'RANKING',
  'GUESS_THE_NUMBER',
  'TWO_BY_TWO'
);

ALTER TABLE "Slide"
  ALTER COLUMN "type" TYPE "SlideType_new"
  USING ("type"::text::"SlideType_new");

ALTER TABLE "Response"
  ALTER COLUMN "type" TYPE "SlideType_new"
  USING ("type"::text::"SlideType_new");

DROP TYPE "SlideType";

ALTER TYPE "SlideType_new" RENAME TO "SlideType";
