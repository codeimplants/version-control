-- Phone + OTP login for the admin console.
-- Nullable so existing admins keep working; set a phone per admin to enable OTP login.

ALTER TABLE "Admin" ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "Admin_phone_key" ON "Admin"("phone");
