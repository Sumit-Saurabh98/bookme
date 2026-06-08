ALTER TABLE "coaches"
ADD COLUMN "baseFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "farePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "coaches"
SET "baseFare" = COALESCE("seatPrices"."averagePrice", 0)
FROM (
    SELECT "coachId", AVG("price") AS "averagePrice"
    FROM "seats"
    GROUP BY "coachId"
) AS "seatPrices"
WHERE "coaches"."id" = "seatPrices"."coachId";

ALTER TABLE "seats" DROP COLUMN "price";
