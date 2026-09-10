-- Staff roles (SELLER, DELIVERY) don't hold membership cards — free their numbers.
UPDATE "User" SET "cardNumber" = NULL, "cardLevel" = NULL, "cardExpiry" = NULL
WHERE role IN ('SELLER', 'DELIVERY');